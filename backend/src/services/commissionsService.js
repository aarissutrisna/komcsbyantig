import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { getActiveUsersInBranch } from './penugasanService.js';

/**
 * Core commission calculation for a single branch on a single date.
 * Uses cs_penugasan for active user lookup and faktor_komisi-based distribution.
 *
 * Commission formula per user:
 *   komisi_user = total_pool × faktor_komisi × kehadiran
 *
 * Kehadiran defaults to 1.0 if no attendance record exists.
 */
async function calculateCommissionByDateCore(connection, branchId, tanggal) {
  // 1. Get branch-level omzet total for this date (with snapshot targets)
  const [omzetRows] = await connection.execute(
    `SELECT SUM(total) as total, MAX(min_omzet) as min_omzet, MAX(max_omzet) as max_omzet
     FROM omzet WHERE branch_id = ? AND date = ?`,
    [branchId, tanggal]
  );

  const branchTotal = parseFloat(omzetRows[0]?.total || 0);
  if (branchTotal === 0) return { success: false, message: 'No omzet data found' };

  // 2. Get targets: prefer snapshot in omzet, fallback to omzetbulanan, then branch defaults
  let min = parseFloat(omzetRows[0]?.min_omzet || 0);
  let max = parseFloat(omzetRows[0]?.max_omzet || 0);

  const month = new Date(tanggal).getMonth() + 1;
  const year = new Date(tanggal).getFullYear();

  if (min === 0 && max === 0) {
    const [targetRows] = await connection.execute(
      'SELECT min_omzet, max_omzet FROM omzetbulanan WHERE branch_id = ? AND month = ? AND year = ?',
      [branchId, month, year]
    );
    if (targetRows.length > 0) {
      min = parseFloat(targetRows[0].min_omzet || 0);
      max = parseFloat(targetRows[0].max_omzet || 0);
    }
  }

  // 3. Get commission percentages
  const [targetRows] = await connection.execute(
    'SELECT comm_perc_min, comm_perc_max FROM omzetbulanan WHERE branch_id = ? AND month = ? AND year = ?',
    [branchId, month, year]
  );
  let pMin, pMax;
  if (targetRows.length > 0) {
    pMin = targetRows[0].comm_perc_min !== null ? parseFloat(targetRows[0].comm_perc_min) : null;
    pMax = targetRows[0].comm_perc_max !== null ? parseFloat(targetRows[0].comm_perc_max) : null;
  }
  if (pMin === null || pMin === undefined || pMax === null || pMax === undefined) {
    const [branchRows] = await connection.execute(
      'SELECT comm_perc_min, comm_perc_max FROM branches WHERE id = ?',
      [branchId]
    );
    pMin = pMin ?? parseFloat(branchRows[0]?.comm_perc_min || 0.2);
    pMax = pMax ?? parseFloat(branchRows[0]?.comm_perc_max || 0.4);
  }

  // 4. Determine which percentage tier applies
  let percentage = 0;
  if (branchTotal >= max && max > 0) {
    percentage = pMax;
  } else if (branchTotal >= min && min > 0) {
    percentage = pMin;
  }

  const totalPool = branchTotal * (percentage / 100);

  // 5. Get CS users active in branch on this date via cs_penugasan
  const csUsers = await getActiveUsersInBranch(branchId, tanggal);

  if (csUsers.length === 0) {
    return { success: true, processed: 0, results: [], message: 'No CS users assigned to this branch on this date' };
  }

  // 6. Calculate distribution using faktor_komisi with 2-person redistribution logic
  const presentUsers = csUsers.filter(u => parseFloat(u.kehadiran ?? 1.0) > 0);
  const totalAssigned = csUsers.length;

  const results = [];
  for (const cs of csUsers) {
    const kehadiran = parseFloat(cs.kehadiran ?? 1.0);
    const faktorOriginal = parseFloat(cs.faktor_komisi || 0);
    let appliedFaktor = faktorOriginal;

    // RULE: Special 2-person branch redistribution
    if (totalAssigned === 2 && presentUsers.length === 1 && kehadiran > 0) {
      if (faktorOriginal >= 0.5) {
        appliedFaktor = 1.0; // 50:50 -> 100 or 75:0 -> 100
      } else {
        appliedFaktor = 0.5; // 0:25 -> 50
      }
    }

    const finalCommission = totalPool * appliedFaktor * kehadiran;

    const commId = uuidv4();
    await connection.execute(
      `INSERT INTO commissions
         (id, user_id, branch_id, omzet_total, commission_amount, commission_percentage,
          porsi_percent, kehadiran, snapshot_meta, period_start, period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         omzet_total = VALUES(omzet_total),
         commission_amount = VALUES(commission_amount),
         commission_percentage = VALUES(commission_percentage),
         porsi_percent = VALUES(porsi_percent),
         kehadiran = VALUES(kehadiran),
         snapshot_meta = VALUES(snapshot_meta),
         period_end = VALUES(period_end)`,
      [
        commId, cs.user_id, branchId, branchTotal, finalCommission, percentage,
        appliedFaktor * 100,  // store the applied factor for accurate history
        kehadiran,
        JSON.stringify({
          faktor_komisi: faktorOriginal,
          applied_faktor: appliedFaktor,
          redistributed: appliedFaktor !== faktorOriginal,
          system: 'cs_penugasan'
        }),
        tanggal, tanggal
      ]
    );

    results.push({
      userId: cs.user_id,
      commission: finalCommission,
      faktorOriginal,
      appliedFaktor,
      kehadiran
    });
  }

  return { success: true, processed: results.length, results };
}

export const calculateCommissionByDate = async (branchId, tanggal) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await calculateCommissionByDateCore(connection, branchId, tanggal);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const recalculateCommissionsForDateInternal = async (connection, branchId, tanggal) => {
  return calculateCommissionByDateCore(connection, branchId, tanggal);
};

export const calculateCommissionByBranch = async (branchId, periodStart, periodEnd) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [omzetRows] = await connection.execute(
      'SELECT DISTINCT date FROM omzet WHERE branch_id = ? AND date >= ? AND date <= ? FOR UPDATE',
      [branchId, periodStart, periodEnd]
    );

    // Clear existing commissions for the branch in the period
    await connection.execute(
      'DELETE FROM commissions WHERE branch_id = ? AND period_start >= ? AND period_start <= ?',
      [branchId, periodStart, periodEnd]
    );

    const results = [];
    for (const row of omzetRows) {
      const result = await calculateCommissionByDateCore(connection, branchId, row.date);
      results.push(result);
    }

    await connection.commit();
    return {
      success: true,
      message: `Calculated commissions for branch ${branchId}`,
      dates_processed: results.length,
      results,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Recalculate ALL commissions across ALL branches for ALL dates that have omzet data.
 * Used by the Admin "Recalculate All" button in AdminSettings.
 * This is a destructive but idempotent operation: it deletes existing commissions
 * and recalculates from scratch based on current cs_penugasan + omzet + attendance data.
 */
export const recalculateAllBranches = async () => {
  const connection = await pool.getConnection();

  try {
    // We isolate this mass calculation logic
    await connection.beginTransaction();

    // Lock the rows we are reading explicitly to prevent N8N from updating omzet concurrently while recalculating
    const [rows] = await connection.execute(
      'SELECT DISTINCT branch_id, date FROM omzet ORDER BY branch_id, date ASC FOR UPDATE'
    );

    if (rows.length === 0) {
      await connection.rollback();
      return { success: true, message: 'Tidak ada data omzet untuk diproses', processed: 0 };
    }

    // Clear all commissions first (full recalculate)
    await connection.execute('DELETE FROM commissions');

    let processed = 0;
    let skipped = 0;
    const errors = [];

    for (const { branch_id, date } of rows) {
      try {
        const result = await calculateCommissionByDateCore(connection, branch_id, date);
        if (result.success !== false) {
          processed += result.processed || 0;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ branch_id, date, error: err.message });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Recalculation failed on ${errors.length} items. First error: ${errors[0].error}`);
    }

    await connection.commit();

    return {
      success: true,
      message: `Rekalkulasi selesai secara aman. ${rows.length} hari diproses, ${processed} komisi dihitung, ${skipped} dilewati, ${errors.length} error.`,
      dates_checked: rows.length,
      commissions_calculated: processed,
      skipped,
      errors: errors.slice(0, 10),
    };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
