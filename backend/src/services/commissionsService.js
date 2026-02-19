import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const calculateCommissionByDate = async (branchId, tanggal) => {
  try {
    const [omzetRows] = await pool.execute(
      'SELECT * FROM omzet WHERE branch_id = ? AND date = ?',
      [branchId, tanggal]
    );

    if (omzetRows.length === 0) {
      return { success: false, message: 'No omzet data found for this date' };
    }

    const omzetData = omzetRows[0];
    const [branchRows] = await pool.execute(
      'SELECT target_min, target_max FROM branches WHERE id = ?',
      [branchId]
    );

    if (branchRows.length === 0) {
      throw new Error('Branch not found');
    }

    const branch = branchRows[0];
    const omzetTotal = omzetData.amount || 0;
    let komisiPersen = 0;

    if (omzetTotal >= branch.target_max) {
      komisiPersen = 0.4;
    } else if (omzetTotal >= branch.target_min) {
      komisiPersen = 0.2;
    }

    const [csRows] = await pool.execute(
      'SELECT id, faktor_pengali FROM users WHERE branch_id = ? AND role = ?',
      [branchId, 'cs']
    );

    const [attendanceRows] = await pool.execute(
      'SELECT user_id, status_kehadiran FROM attendance_data WHERE branch_id = ? AND tanggal = ?',
      [branchId, tanggal]
    );

    const commissionData = csRows.map((cs) => {
      const attendance = attendanceRows.find((a) => a.user_id === cs.id);
      const status = attendance?.status_kehadiran || 'alpha';

      let statusMultiplier = 0;
      if (status === 'hadir') statusMultiplier = 1;
      else if (status === 'setengah' || status === 'izin') statusMultiplier = 0.5;

      const komisiNominal = omzetTotal * (komisiPersen / 100);
      const totalKomisi = komisiNominal * (cs.faktor_pengali || 0) * statusMultiplier;

      return {
        user_id: cs.id,
        branch_id: branchId,
        tanggal: tanggal,
        omzet: omzetTotal,
        attendance_status: status,
        faktor_pengali: cs.faktor_pengali || 0,
        komisi_persen: komisiPersen,
        komisi_nominal: komisiNominal,
        total_komisi: totalKomisi,
      };
    });

    if (commissionData.length > 0) {
      for (const commission of commissionData) {
        const id = uuidv4();
        await pool.execute(
          `INSERT INTO commissions (id, user_id, branch_id, omzet_total, commission_amount, commission_percentage, period_start, period_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           commission_amount = ?, commission_percentage = ?`,
          [
            id,
            commission.user_id,
            commission.branch_id,
            commission.omzet,
            commission.total_komisi,
            commission.komisi_persen,
            commission.tanggal,
            commission.tanggal,
            commission.total_komisi,
            commission.komisi_persen
          ]
        );
      }
    }

    return {
      success: true,
      message: `Calculated commissions for ${commissionData.length} CS users`,
      omzet: omzetTotal,
      komisiPersen: komisiPersen,
      commissions: commissionData,
    };
  } catch (error) {
    throw error;
  }
};

export const calculateCommissionByBranch = async (branchId, periodStart, periodEnd) => {
  try {
    const [omzetRows] = await pool.execute(
      'SELECT DISTINCT date FROM omzet WHERE branch_id = ? AND date >= ? AND date <= ?',
      [branchId, periodStart, periodEnd]
    );

    const results = [];
    for (const row of omzetRows) {
      const result = await calculateCommissionByDate(branchId, row.date);
      results.push(result);
    }

    return {
      success: true,
      message: `Calculated commissions for branch ${branchId}`,
      dates_processed: results.length,
      results: results,
    };
  } catch (error) {
    throw error;
  }
};
