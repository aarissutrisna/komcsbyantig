import pool from '../config/database.js';
import * as commissionsService from './commissionsService.js';
import { v4 as uuidv4 } from 'uuid'; // I'll need to add uuid to package.json dependencies

export const createOmzet = async (userId, branchId, cash, piutang, date, description) => {
  try {
    const id = uuidv4();
    const total = parseFloat(cash || 0) + parseFloat(piutang || 0);

    await pool.execute(
      `INSERT INTO omzet (id, user_id, branch_id, cash, bayar_piutang, total, date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, branchId, cash, piutang, total, date, description]
    );

    const [rows] = await pool.execute('SELECT * FROM omzet WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

export const getOmzetByDate = async (date, branchScope) => {
  try {
    let query = 'SELECT * FROM omzet WHERE date = ?';
    let params = [date];

    if (branchScope) {
      query += ' AND branch_id = ?';
      params.push(branchScope);
    }

    query += ' ORDER BY branch_id';
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get aggregated omzet for a branch or all branches
 */
export const getAggregatedOmzet = async (branchId, month, year) => {
  try {
    let query = `
            SELECT 
                o.date as id,
                o.date,
                SUM(o.cash) as cash,
                SUM(o.bayar_piutang) as bayar_piutang,
                SUM(o.total) as total,
                (
                  SELECT COALESCE(SUM(c.commission_amount), 0)
                  FROM commissions c 
                  WHERE c.period_start = o.date
                  ${branchId && branchId !== 'all' ? 'AND c.branch_id = ?' : ''}
                ) as komisi
            FROM omzet o
            WHERE 1=1
        `;
    const params = [];
    if (branchId && branchId !== 'all') {
      params.push(branchId);
    }

    if (branchId && branchId !== 'all') {
      query += ' AND o.branch_id = ?';
      params.push(branchId);
    }

    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      query += ' AND o.date LIKE ?';
      params.push(`${year}-${monthStr}%`);
    }

    query += ' GROUP BY o.date ORDER BY o.date DESC';
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Get omzet for a specific user with month/year filter
 */
export const getOmzetByUserFiltered = async (userId, month, year) => {
  try {
    // For CS users: get branch omzet + their personal commission/attendance
    // For admin: get omzet they own
    const [userRows] = await pool.execute('SELECT id, branch_id, role FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    if (!user) throw new Error('User not found');

    let query;
    let params;

    if (user.role === 'cs' && user.branch_id) {
      // CS user: show branch omzet with their personal commission & attendance
      query = `
        SELECT 
          o.*, 
          ? as username,
          (SELECT nama FROM users WHERE id = ?) as nama,
          COALESCE(a.kehadiran, 1.0) as kehadiran,
          COALESCE(c.commission_amount, 0) as komisi
        FROM omzet o 
        LEFT JOIN attendance_data a ON a.user_id = ? AND o.branch_id = a.branch_id AND o.date = a.tanggal
        LEFT JOIN commissions c ON c.user_id = ? AND o.branch_id = c.branch_id AND o.date = c.period_start
        WHERE o.branch_id = ?
      `;
      params = [user.id, userId, userId, userId, user.branch_id];
    } else {
      // Admin/HRD: show omzet they own
      query = `
        SELECT 
          o.*, 
          u.username, 
          u.nama,
          1.0 as kehadiran,
          0 as komisi
        FROM omzet o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.user_id = ?
      `;
      params = [userId];
    }

    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      query += ' AND o.date LIKE ?';
      params.push(`${year}-${monthStr}%`);
    }

    query += ' ORDER BY o.date DESC';
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Existing methods updated for consistency
 */
export const getOmzetByBranch = async (branchId, month, year) => {
  // Branch-level omzet with aggregated commission totals
  try {
    const monthStr = String(month).padStart(2, '0');
    const [rows] = await pool.execute(
      `SELECT 
        o.*, 
        u.username, 
        u.nama,
        1.0 as kehadiran,
        COALESCE((SELECT SUM(c.commission_amount) FROM commissions c WHERE c.branch_id = o.branch_id AND c.period_start = o.date), 0) as komisi,
        b.name as branch_name
      FROM omzet o 
      JOIN users u ON o.user_id = u.id 
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.branch_id = ? AND o.date LIKE ? 
      ORDER BY o.date DESC`,
      [branchId, `${year}-${monthStr}%`]
    );
    return rows;
  } catch (error) {
    throw error;
  }
};

/**
 * Update individual kehadiran and recalculate commission
 */
export const updateKehadiran = async (userId, recordId, kehadiran) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get record to know branch and date
    const [rows] = await connection.execute('SELECT branch_id, date FROM omzet WHERE id = ?', [recordId]);
    if (rows.length === 0) throw new Error('Record not found');
    const { branch_id, date } = rows[0];

    // 2. Update kehadiran in attendance_data
    await connection.execute(
      `INSERT INTO attendance_data (id, user_id, branch_id, tanggal, kehadiran)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE kehadiran = VALUES(kehadiran)`,
      [uuidv4(), userId, branch_id, date, kehadiran]
    );

    // 3. Recalculate
    await commissionsService.recalculateCommissionsForDateInternal(connection, branch_id, date);

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const syncOmzetFromN8N = async (branchId, omzetItems) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get admin user for record ownership (omzet is branch-level data)
    const [adminRows] = await connection.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    const ownerId = adminRows[0]?.id;
    if (!ownerId) throw new Error('No admin user found to own omzet records');

    const results = [];
    for (const item of omzetItems) {
      const tanggal = convertDateFormat(item.tanggal);
      const cash = parseFloat(item.cash || 0);
      const piutang = parseFloat(item.piutang || 0);
      const total = cash + piutang;
      const description = `Cash: ${cash}, Piutang: ${piutang}`;

      // Single record per branch per date
      const id = uuidv4();
      await connection.execute(
        `INSERT INTO omzet (id, user_id, branch_id, date, cash, bayar_piutang, total, description, source, last_synced_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                   ON DUPLICATE KEY UPDATE 
                   cash = VALUES(cash), 
                   bayar_piutang = VALUES(bayar_piutang), 
                   total = VALUES(total),
                   description = VALUES(description),
                   last_synced_at = CURRENT_TIMESTAMP`,
        [id, ownerId, branchId, tanggal, cash, piutang, total, description, 'AUTO']
      );

      // Recalculate commissions for CS users in this branch
      await commissionsService.recalculateCommissionsForDateInternal(connection, branchId, tanggal);

      results.push({ tanggal, branchId, total });
    }

    await connection.execute(
      'UPDATE branches SET last_sync_at = NOW() WHERE id = ?',
      [branchId]
    );

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const fetchAndSyncFromN8N = async (branchId, startDate, endDate) => {
  try {
    const [branches] = await pool.execute(
      'SELECT n8n_endpoint FROM branches WHERE id = ?',
      [branchId]
    );

    if (branches.length === 0 || !branches[0].n8n_endpoint) {
      throw new Error('Branch not found or N8N endpoint not configured');
    }

    const n8nEndpoint = branches[0].n8n_endpoint;

    const response = await fetch(n8nEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from N8N');
    }

    const rawData = await response.json();
    const n8nData = Array.isArray(rawData) ? rawData : [rawData];

    const validatedData = n8nData.filter((item) =>
      item && typeof item === 'object' &&
      typeof item.tanggal === 'string' &&
      (typeof item.cash === 'number' || item.cash === null) &&
      (typeof item.piutang === 'number' || item.piutang === null)
    );

    if (validatedData.length === 0) {
      throw new Error('No valid data received from N8N');
    }

    const results = await syncOmzetFromN8N(branchId, validatedData);

    return {
      success: true,
      message: `Synced ${results.length} records from N8N`,
      recordsInserted: results.length,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get stats for dashboard including chart data
 */
export const getOmzetStats = async (branchId, month, year, userId) => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const today = new Date().toISOString().split('T')[0];

    // Omzet stats (branch-level, no user filter needed)
    let omzetStatsQuery = `
      SELECT SUM(o.total) as monthlyOmzet
      FROM omzet o
      WHERE o.date LIKE ?
    `;
    const omzetParams = [`${year}-${monthStr}%`];

    if (branchId && branchId !== 'all') {
      omzetStatsQuery += ' AND o.branch_id = ?';
      omzetParams.push(branchId);
    }

    const [omzetStats] = await pool.execute(omzetStatsQuery, omzetParams);

    // Commission stats (per CS user or total)
    let commStatsQuery = `
      SELECT SUM(c.commission_amount) as totalCommission
      FROM commissions c
      WHERE c.period_start LIKE ?
    `;
    const commParams = [`${year}-${monthStr}%`];

    if (branchId && branchId !== 'all') {
      commStatsQuery += ' AND c.branch_id = ?';
      commParams.push(branchId);
    }
    if (userId && userId !== 'all') {
      commStatsQuery += ' AND c.user_id = ?';
      commParams.push(userId);
    }

    const [commStats] = await pool.execute(commStatsQuery, commParams);

    // Today's omzet
    let todayOmzetQuery = `SELECT SUM(o.total) as todayOmzet FROM omzet o WHERE o.date = ?`;
    const todayOmzetParams = [today];
    if (branchId && branchId !== 'all') {
      todayOmzetQuery += ' AND o.branch_id = ?';
      todayOmzetParams.push(branchId);
    }
    const [todayOmzet] = await pool.execute(todayOmzetQuery, todayOmzetParams);

    // Today's commission
    let todayCommQuery = `SELECT SUM(c.commission_amount) as todayCommission FROM commissions c WHERE c.period_start = ?`;
    const todayCommParams = [today];
    if (branchId && branchId !== 'all') {
      todayCommQuery += ' AND c.branch_id = ?';
      todayCommParams.push(branchId);
    }
    if (userId && userId !== 'all') {
      todayCommQuery += ' AND c.user_id = ?';
      todayCommParams.push(userId);
    }
    const [todayComm] = await pool.execute(todayCommQuery, todayCommParams);

    // 5. Chart data (daily omzet + aggregated commission)
    // When branchId is 'all', we also want per-branch breakdown
    let chartQuery;
    let chartParams = [];

    if (branchId === 'all') {
      // Fetch daily data grouped by date AND branch to allow per-branch lines
      chartQuery = `
        SELECT 
          o.date,
          o.branch_id,
          SUM(o.total) as branch_total
        FROM omzet o
        WHERE o.date LIKE ?
        GROUP BY o.date, o.branch_id
        ORDER BY o.date ASC
      `;
      chartParams.push(`${year}-${monthStr}%`);
    }

    // Also get the standard daily aggregate (Total Omzet & Total Commission for the chart dots)
    let aggregateQuery = `
      SELECT 
        o.date,
        SUM(o.cash) as cash,
        SUM(o.bayar_piutang) as piutang,
        SUM(o.total) as total,
        COALESCE((
          SELECT SUM(c.commission_amount) 
          FROM commissions c 
          WHERE c.period_start = o.date
    `;

    const aggregateParams = [];
    if (userId && userId !== 'all') {
      aggregateQuery += ' AND c.user_id = ?';
      aggregateParams.push(userId);
    }
    if (branchId && branchId !== 'all') {
      aggregateQuery += ' AND c.branch_id = ?';
      aggregateParams.push(branchId);
    }

    aggregateQuery += `
        ), 0) as komisi
      FROM omzet o
      WHERE o.date LIKE ?
    `;
    aggregateParams.push(`${year}-${monthStr}%`);

    if (branchId && branchId !== 'all') {
      aggregateQuery += ' AND o.branch_id = ?';
      aggregateParams.push(branchId);
    }

    aggregateQuery += ' GROUP BY o.date ORDER BY o.date ASC';

    const [aggregateRows] = await pool.execute(aggregateQuery, aggregateParams);

    // If 'all', fetch per-branch details and merge
    let branchDataMap = {};
    if (branchId === 'all') {
      const [branchRows] = await pool.execute(chartQuery, chartParams);
      branchRows.forEach(row => {
        const d = new Date(row.date).toISOString().split('T')[0];
        if (!branchDataMap[d]) branchDataMap[d] = {};
        branchDataMap[d][`${row.branch_id}_omzet`] = parseFloat(row.branch_total || 0);
      });
    }

    const chartData = aggregateRows.map(row => {
      const d = new Date(row.date).toISOString().split('T')[0];
      const base = {
        date: row.date,
        cash: parseFloat(row.cash || 0),
        piutang: parseFloat(row.piutang || 0),
        total: parseFloat(row.total || 0),
        komisi: parseFloat(row.komisi || 0)
      };

      if (branchId === 'all' && branchDataMap[d]) {
        return { ...base, ...branchDataMap[d] };
      }
      return base;
    });

    return {
      todayOmzet: todayOmzet[0]?.todayOmzet || 0,
      todayCommission: todayComm[0]?.todayCommission || 0,
      totalCommission: commStats[0]?.totalCommission || 0,
      monthlyOmzet: omzetStats[0]?.monthlyOmzet || 0,
      chartData
    };
  } catch (error) {
    throw error;
  }
};

const convertDateFormat = (val) => {
  if (!val) return null;
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // If DD/MM/YYYY
  const parts = val.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return val;
};
