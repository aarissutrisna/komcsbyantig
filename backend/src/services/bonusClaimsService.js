import pool from '../config/database.js';

/**
 * Buat klaim baru beserta detail itemnya menggunakan Database Transaction.
 */
export const createClaim = async ({
  keterangan,
  startDate,
  endDate,
  direction,
  pembagi,
  pengali,
  totalNilai,
  bonusAmount,
  items,
  createdById,
  createdByName
}) => {
  if (!items || items.length === 0) {
    throw new Error('Tidak ada item transaksi yang dipilih.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Cek apakah ada notransaksi yang sudah diklaim sebelumnya untuk mencegah double-claim
    const notransaksiList = items.map(item => item.notransaksi);
    const [existing] = await conn.query(
      'SELECT notransaksi FROM bonus_transfer_claim_items WHERE notransaksi IN (?)',
      [notransaksiList]
    );

    if (existing.length > 0) {
      const dupIds = existing.map(e => e.notransaksi).join(', ');
      throw new Error(`Transaksi berikut sudah pernah diklaim sebelumnya: ${dupIds}`);
    }

    // 2. Insert header klaim
    const [headerResult] = await conn.execute(
      `INSERT INTO bonus_transfer_claims 
        (keterangan, start_date, end_date, direction, pembagi, pengali, total_nilai, bonus_amount, item_count, created_by_id, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        keterangan,
        startDate,
        endDate,
        direction,
        pembagi,
        pengali,
        totalNilai,
        bonusAmount,
        items.length,
        createdById,
        createdByName
      ]
    );

    const claimId = headerResult.insertId;

    // 3. Bulk insert items detail
    const itemValues = items.map(item => [
      claimId,
      item.notransaksi,
      item.tanggal,
      item.kantordari,
      item.kantortujuan,
      item.keterangan || '',
      parseFloat(String(item.total_nilai || 0))
    ]);

    await conn.query(
      `INSERT INTO bonus_transfer_claim_items 
        (claim_id, notransaksi, tanggal, kantordari, kantortujuan, keterangan, total_nilai)
       VALUES ?`,
      [itemValues]
    );

    await conn.commit();
    return { success: true, claimId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Ambil semua data klaim bonus untuk histori.
 */
export const getAllClaims = async () => {
  const [rows] = await pool.execute(
    `SELECT id, keterangan, start_date, end_date, direction, pembagi, pengali, 
            total_nilai, bonus_amount, item_count, created_by_id, created_by_name, created_at
     FROM bonus_transfer_claims
     ORDER BY created_at DESC`
  );
  return rows;
};

/**
 * Ambil detail klaim beserta item-item di dalamnya.
 */
export const getClaimById = async (id) => {
  const [claimRows] = await pool.execute(
    'SELECT * FROM bonus_transfer_claims WHERE id = ?',
    [id]
  );
  if (claimRows.length === 0) return null;

  const [itemRows] = await pool.execute(
    'SELECT * FROM bonus_transfer_claim_items WHERE claim_id = ?',
    [id]
  );

  return {
    ...claimRows[0],
    items: itemRows
  };
};

/**
 * Hapus klaim bonus berdasarkan ID (memicu ON DELETE CASCADE pada item-itemnya).
 */
export const deleteClaim = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM bonus_transfer_claims WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};

/**
 * Ambil semua notransaksi yang sudah diklaim untuk mem-filter tampilan frontend.
 */
export const getClaimedNotransaksiList = async () => {
  const [rows] = await pool.execute(
    'SELECT DISTINCT notransaksi FROM bonus_transfer_claim_items'
  );
  return rows.map(r => r.notransaksi);
};
