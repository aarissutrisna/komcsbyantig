import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the active branch for a user on a specific date.
 */
export const getActiveCabangForUser = async (userId, tanggal) => {
    const [rows] = await pool.execute(
        `SELECT cabang_id FROM user_cabang_history
     WHERE user_id = ?
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY start_date DESC LIMIT 1`,
        [userId, tanggal, tanggal]
    );
    return rows[0]?.cabang_id || null;
};

/**
 * Get all CS users active in a branch on a specific date.
 */
export const getActiveUsersInBranch = async (cabangId, tanggal) => {
    const [rows] = await pool.execute(
        `SELECT h.user_id, u.nama, u.faktor_pengali,
            COALESCE(a.kehadiran, 1.0) as kehadiran,
            COALESCE(
              (SELECT ap.porsi_percent FROM cabang_user_allocation ap
               WHERE ap.cabang_id = h.cabang_id AND ap.user_id = h.user_id
                 AND ap.start_date <= ? AND (ap.end_date IS NULL OR ap.end_date >= ?)
               ORDER BY ap.start_date DESC LIMIT 1),
              100.00
            ) as porsi_percent
     FROM user_cabang_history h
     JOIN users u ON u.id = h.user_id
     LEFT JOIN attendance_data a ON a.user_id = h.user_id AND a.branch_id = h.cabang_id AND a.tanggal = ?
     WHERE h.cabang_id = ?
       AND h.start_date <= ?
       AND (h.end_date IS NULL OR h.end_date >= ?)
       AND u.role = 'cs'`,
        [tanggal, tanggal, tanggal, cabangId, tanggal, tanggal]
    );
    return rows;
};

/**
 * Get full branch history for a user.
 */
export const getUserCabangHistory = async (userId) => {
    const [rows] = await pool.execute(
        `SELECT h.*, b.name as cabang_name
     FROM user_cabang_history h
     JOIN branches b ON b.id = h.cabang_id
     WHERE h.user_id = ?
     ORDER BY h.start_date DESC`,
        [userId]
    );
    return rows;
};

/**
 * Get all histories (for admin view).
 */
export const getAllMutasiHistory = async () => {
    const [rows] = await pool.execute(
        `SELECT h.*, u.nama as user_nama, u.username, b.name as cabang_name,
            cb.nama as created_by_nama
     FROM user_cabang_history h
     JOIN users u ON u.id = h.user_id
     JOIN branches b ON b.id = h.cabang_id
     LEFT JOIN users cb ON cb.id = h.created_by
     ORDER BY h.created_at DESC`
    );
    return rows;
};

/**
 * Get allocation setup for a branch.
 */
export const getAllocationsByBranch = async (cabangId, tanggal) => {
    const [rows] = await pool.execute(
        `SELECT a.*, u.nama as user_nama, u.username
     FROM cabang_user_allocation a
     JOIN users u ON u.id = a.user_id
     WHERE a.cabang_id = ?
       AND a.start_date <= ?
       AND (a.end_date IS NULL OR a.end_date >= ?)
     ORDER BY a.start_date DESC`,
        [cabangId, tanggal, tanggal]
    );
    return rows;
};

/**
 * Check for date overlap in user_cabang_history for a given user.
 * Returns true if an overlap exists.
 */
export const hasOverlap = async (connection, userId, startDate, endDate, excludeId = null) => {
    let sql = `
    SELECT id FROM user_cabang_history
    WHERE user_id = ?
      AND start_date <= ?
      AND (end_date IS NULL OR end_date >= ?)
  `;
    const params = [userId, endDate || '9999-12-31', startDate];

    if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
    }

    const [rows] = await connection.execute(sql, params);
    return rows.length > 0;
};

/**
 * Create a branch mutation for a user.
 * Automatically terminates any existing open history and validates overlaps.
 */
export const createMutation = async ({ userId, cabangId, startDate, endDate, createdBy }) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Close any open (NULL end_date) history records that overlap with the new range
        await connection.execute(
            `UPDATE user_cabang_history
       SET end_date = DATE_SUB(?, INTERVAL 1 DAY)
       WHERE user_id = ?
         AND (end_date IS NULL OR end_date >= ?)
         AND start_date < ?`,
            [startDate, userId, startDate, startDate]
        );

        // 2. Check for remaining overlaps (e.g., existing fixed-range records)
        const overlap = await hasOverlap(connection, userId, startDate, endDate);
        if (overlap) {
            throw new Error('Tanggal mutasi bertabrakan dengan histori yang sudah ada. Selesaikan histori lama terlebih dahulu.');
        }

        // 3. Insert new history record
        const id = uuidv4();
        await connection.execute(
            `INSERT INTO user_cabang_history (id, user_id, cabang_id, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, cabangId, startDate, endDate || null, createdBy || null]
        );

        // 4. Set default allocation (100%) for the new assignment
        const allocId = uuidv4();
        await connection.execute(
            `INSERT INTO cabang_user_allocation (id, cabang_id, user_id, start_date, end_date, porsi_percent, created_by)
       VALUES (?, ?, ?, ?, ?, 100.00, ?)`,
            [allocId, cabangId, userId, startDate, endDate || null, createdBy || null]
        );

        await connection.commit();

        const [rows] = await pool.execute(
            'SELECT h.*, b.name as cabang_name FROM user_cabang_history h JOIN branches b ON b.id = h.cabang_id WHERE h.id = ?',
            [id]
        );
        return rows[0];
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Update the porsi_percent for a specific allocation.
 */
export const updateAllocation = async (allocationId, porsiPercent) => {
    const [result] = await pool.execute(
        'UPDATE cabang_user_allocation SET porsi_percent = ? WHERE id = ?',
        [porsiPercent, allocationId]
    );
    if (result.affectedRows === 0) throw new Error('Allocation not found');

    const [rows] = await pool.execute(
        'SELECT * FROM cabang_user_allocation WHERE id = ?',
        [allocationId]
    );
    return rows[0];
};

/**
 * Get a summary of affected dates for a proposed mutation range.
 * (Days that already have calculated commissions → need recalculation)
 */
export const getAffectedDates = async (cabangId, startDate, endDate) => {
    const [rows] = await pool.execute(
        `SELECT DISTINCT c.period_start as tanggal
     FROM commissions c
     WHERE c.branch_id = ?
       AND c.period_start >= ?
       AND c.period_start <= ?
     ORDER BY c.period_start`,
        [cabangId, startDate, endDate || '9999-12-31']
    );
    return rows.map(r => r.tanggal);
};
