import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the active penugasan for a specific user on a specific date.
 * Logic: tanggal_mulai <= tanggal, order DESC, take 1.
 */
export const getActivePenugasanForUser = async (userId, tanggal) => {
  const [rows] = await pool.execute(
    `SELECT p.*, b.name as cabang_name
         FROM cs_penugasan p
         JOIN branches b ON b.id = p.cabang_id
         WHERE p.user_id = ?
           AND p.tanggal_mulai <= ?
         ORDER BY p.tanggal_mulai DESC
         LIMIT 1`,
    [userId, tanggal]
  );
  return rows[0] || null;
};

/**
 * Get all CS users with active penugasan in a branch on a specific date.
 * Includes their kehadiran (attendance), defaulting to 1 if no data.
 * Respects tanggal_selesai: resigned users are excluded after their end date.
 */
export const getActiveUsersInBranch = async (cabangId, tanggal) => {
  const [rows] = await pool.execute(
    `SELECT
           p.user_id,
           p.faktor_komisi,
           u.nama,
           COALESCE(a.kehadiran, 1.0) as kehadiran
         FROM cs_penugasan p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN attendance_data a
           ON a.user_id = p.user_id
           AND a.branch_id = p.cabang_id
           AND a.tanggal = ?
         WHERE p.cabang_id = ?
           AND p.tanggal_mulai <= ?
           AND (p.tanggal_selesai IS NULL OR p.tanggal_selesai >= ?)
           AND u.role = 'cs'
           AND p.tanggal_mulai = (
             -- Only include users whose latest penugasan before/on this date is THIS cabang
             SELECT MAX(p2.tanggal_mulai)
             FROM cs_penugasan p2
             WHERE p2.user_id = p.user_id
               AND p2.tanggal_mulai <= ?
           )`,
    [tanggal, cabangId, tanggal, tanggal, tanggal]
  );
  return rows;
};

/**
 * Get all penugasan records (for admin list view).
 */
export const getAllPenugasan = async () => {
  const [rows] = await pool.execute(
    `SELECT
           p.id,
           p.user_id,
           u.nama as user_nama,
           u.username,
           p.cabang_id,
           b.name as cabang_name,
           p.tanggal_mulai,
           p.faktor_komisi,
           p.created_at
         FROM cs_penugasan p
         JOIN users u ON u.id = p.user_id
         JOIN branches b ON b.id = p.cabang_id
         ORDER BY p.created_at DESC`
  );
  return rows;
};

/**
 * Get total active faktor_komisi for a branch on a given date (excluding a specific user if provided).
 * Used for 100% cap validation with Row Locking (FOR UPDATE) inside a transaction.
 */
export const getTotalFaktorInBranch = async (connection, cabangId, tanggalMulai, excludeUserId = null) => {
  // A user is "active in branch" on a date if their latest penugasan before/on that date
  // resolves to THIS cabang AND that penugasan hasn't ended yet (tanggal_selesai >= tanggalMulai)
  let sql = `
        SELECT SUM(p.faktor_komisi) as total
        FROM cs_penugasan p
        JOIN users u ON u.id = p.user_id AND u.role = 'cs'
        WHERE p.cabang_id = ?
          AND p.tanggal_mulai <= ?
          AND (p.tanggal_selesai IS NULL OR p.tanggal_selesai >= ?)
          AND p.tanggal_mulai = (
            SELECT MAX(p2.tanggal_mulai)
            FROM cs_penugasan p2
            WHERE p2.user_id = p.user_id
              AND p2.tanggal_mulai <= ?
          )
    `;
  const params = [cabangId, tanggalMulai, tanggalMulai, tanggalMulai];

  if (excludeUserId) {
    sql += ' AND p.user_id != ?';
    params.push(excludeUserId);
  }

  // Must lock the rows matching this constraint to prevent another insert reading the old factor simultaneously
  sql += ' FOR UPDATE';

  const [rows] = await connection.execute(sql, params);
  return parseFloat(rows[0]?.total || 0);
};

/**
 * Create a new penugasan for a CS user safely using transactions.
 */
export const createPenugasan = async ({ userId, cabangId, tanggalMulai, faktorKomisi, createdBy }) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Validate user role is CS
    const [userRows] = await conn.execute(
      'SELECT id, nama, role FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) throw new Error('User tidak ditemukan');
    if (userRows[0].role !== 'cs') throw new Error('Penugasan hanya diperbolehkan untuk user dengan role CS');

    // 2. Validate faktor_komisi range
    const faktor = parseFloat(faktorKomisi);
    if (isNaN(faktor) || faktor <= 0) throw new Error('Faktor komisi harus lebih dari 0');
    if (faktor > 1) throw new Error('Faktor komisi tidak boleh lebih dari 1 (100%)');

    // 3. Validate tanggal
    if (!tanggalMulai) throw new Error('Tanggal mulai wajib diisi');

    // 4. Validate total branch faktor <= 1 (Transaction Safe)
    const totalExisting = await getTotalFaktorInBranch(conn, cabangId, tanggalMulai, userId);
    if (totalExisting + faktor > 1) {
      const available = (1 - totalExisting).toFixed(2);
      throw new Error(`Total porsi komisi cabang melebihi 100%. Sisa porsi tersedia: ${(Math.max(0, available) * 100).toFixed(0)}%`);
    }

    // 5. Insert
    const id = uuidv4();
    await conn.execute(
      `INSERT INTO cs_penugasan (id, user_id, cabang_id, tanggal_mulai, faktor_komisi)
             VALUES (?, ?, ?, ?, ?)`,
      [id, userId, cabangId, tanggalMulai, faktor]
    );

    // Fetch back for output
    const [rows] = await conn.execute(
      `SELECT p.*, u.nama as user_nama, b.name as cabang_name
             FROM cs_penugasan p
             JOIN users u ON u.id = p.user_id
             JOIN branches b ON b.id = p.cabang_id
             WHERE p.id = ?`,
      [id]
    );

    await conn.commit();
    return rows[0];

  } catch (err) {
    await conn.rollback();
    // Friendly DB constraint error matching
    if (err.code === 'ER_DUP_ENTRY') throw new Error('User sudah memiliki penugasan di cabang tersebut pada tanggal ini.');
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') throw new Error('Nilai faktor komisi ditolak oleh sistem (syarat: > 0 dan <= 1)');
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Delete a penugasan record.
 */
export const deletePenugasan = async (id) => {
  await pool.execute('DELETE FROM cs_penugasan WHERE id = ?', [id]);
  return { success: true };
};

/**
 * Get all distinct branches a CS user has ever been assigned to.
 * Used by the frontend to show historical branch data access.
 */
export const getMyBranches = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT DISTINCT p.cabang_id as id, b.name, MAX(p.tanggal_mulai) as last_assigned
         FROM cs_penugasan p
         JOIN branches b ON b.id = p.cabang_id
         WHERE p.user_id = ?
         GROUP BY p.cabang_id, b.name
         ORDER BY last_assigned DESC`,
    [userId]
  );
  return rows;
};

/**
 * Get the latest active assignment per user per branch.
 * Returns grouped by cabang_id so frontend can render per-branch tabs.
 */
export const getRekapPenugasanTerakhir = async () => {
  const [rows] = await pool.execute(
    `SELECT
           p.id,
           p.user_id,
           u.nama as user_nama,
           u.username,
           p.cabang_id,
           b.name as cabang_name,
           p.tanggal_mulai,
           p.faktor_komisi
         FROM cs_penugasan p
         JOIN users u ON u.id = p.user_id
         JOIN branches b ON b.id = p.cabang_id
         JOIN (
           -- Latest assignment date for EACH user (Global)
           -- A user is considered active in only ONE configuration
           -- which is their most recent assignment.
           SELECT user_id, MAX(tanggal_mulai) as max_date
           FROM cs_penugasan
           GROUP BY user_id
         ) latest ON p.user_id = latest.user_id AND p.tanggal_mulai = latest.max_date
         WHERE u.role = 'cs'
         ORDER BY p.cabang_id ASC, p.faktor_komisi DESC`
  );
  return rows;
};

/**
 * Get full chronological assignment history for a branch.
 * Used for the Histori tab — each row is a recorded penugasan change.
 */
export const getHistoriPenugasanByCabang = async (cabangId) => {
  let sql = `
        SELECT
          d.tanggal_mulai,
           (
            SELECT GROUP_CONCAT(DISTINCT
              CONCAT(u.nama, ' ', ROUND(p2.faktor_komisi * 100, 0), '%')
              ORDER BY p2.faktor_komisi DESC
              SEPARATOR ' - '
            )
            FROM cs_penugasan p2
            JOIN users u ON u.id = p2.user_id
            WHERE p2.cabang_id = ?
              AND p2.tanggal_mulai <= d.tanggal_mulai
              AND p2.tanggal_mulai = (
                SELECT MAX(p3.tanggal_mulai)
                FROM cs_penugasan p3
                WHERE p3.user_id = p2.user_id
                  AND p3.tanggal_mulai <= d.tanggal_mulai
              )
          ) as pembagian
        FROM (
          SELECT DISTINCT tanggal_mulai 
          FROM cs_penugasan 
          WHERE cabang_id = ?
        ) d
        ORDER BY d.tanggal_mulai ASC
    `;
  const params = [cabangId, cabangId];
  const [rows] = await pool.execute(sql, params);
  return rows;
};
