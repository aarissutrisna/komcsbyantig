import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// ─── CREATE WITHDRAWAL REQUEST (CS) ─────────────────────────────────────────
export const createWithdrawalRequest = async (userId, nominal, metode = 'transfer', keterangan = '') => {
  try {
    const [commRows] = await pool.execute(
      'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = ?',
      [userId]
    );
    const totalKomisi = commRows[0]?.total_komisi || 0;

    const [mutRows] = await pool.execute(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
       FROM commission_mutations WHERE user_id = ?`,
      [userId]
    );
    const totalMutations = mutRows[0]?.net_mutations || 0;
    const availableBalance = parseFloat(totalKomisi) + parseFloat(totalMutations);

    if (nominal > availableBalance) {
      throw new Error(`Saldo tidak cukup. Tersedia: ${availableBalance}, Diminta: ${nominal}`);
    }

    const [penugasanRows] = await pool.execute(
      'SELECT cabang_id FROM cs_penugasan WHERE user_id = ? ORDER BY tanggal_mulai DESC LIMIT 1',
      [userId]
    );
    const [userRows] = await pool.execute('SELECT branch_id FROM users WHERE id = ?', [userId]);
    const branchId = penugasanRows[0]?.cabang_id || userRows[0]?.branch_id || null;

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO withdrawal_requests (id, user_id, branch_id, nominal, metode, keterangan, status, tanggal)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_DATE)`,
      [id, userId, branchId, nominal, metode, keterangan]
    );

    const [newWd] = await pool.execute('SELECT * FROM withdrawal_requests WHERE id = ?', [id]);
    return { success: true, message: 'Pengajuan berhasil dibuat', availableBalance, withdrawal: newWd[0] };
  } catch (error) {
    throw error;
  }
};

// ─── APPROVE/REJECT WITHDRAWAL ───────────────────────────────────────────────
export const approveWithdrawalRequest = async (withdrawalId, approved, catatan) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [wdRows] = await connection.execute(
      'SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE',
      [withdrawalId]
    );
    if (wdRows.length === 0) throw new Error('Pengajuan tidak ditemukan');
    const withdrawal = wdRows[0];
    if (withdrawal.status !== 'pending') throw new Error('Pengajuan sudah diproses');

    const newStatus = approved ? 'approved' : 'rejected';

    if (approved) {
      const [commRows] = await connection.execute(
        'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = ?',
        [withdrawal.user_id]
      );
      const totalKomisi = parseFloat(commRows[0]?.total_komisi || 0);

      const [mutRows] = await connection.execute(
        `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
         FROM commission_mutations WHERE user_id = ?`,
        [withdrawal.user_id]
      );
      const totalMutations = parseFloat(mutRows[0]?.net_mutations || 0);
      const currentBalance = totalKomisi + totalMutations;

      if (withdrawal.nominal > currentBalance) {
        throw new Error(`Saldo tidak cukup. Tersedia: ${currentBalance}, Diminta: ${withdrawal.nominal}`);
      }

      const saldoSetelah = currentBalance - parseFloat(withdrawal.nominal);
      const mutId = uuidv4();
      await connection.execute(
        `INSERT INTO commission_mutations (id, user_id, branch_id, tanggal, tipe, nominal, metode, saldo_setelah, keterangan)
         VALUES (?, ?, ?, CURRENT_DATE, 'keluar', ?, ?, ?, ?)`,
        [
          mutId, withdrawal.user_id, withdrawal.branch_id,
          withdrawal.nominal, withdrawal.metode || 'transfer',
          saldoSetelah, `Penarikan - ${catatan || withdrawal.keterangan || ''}`.trim()
        ]
      );
    }

    await connection.execute(
      `UPDATE withdrawal_requests SET status = ?, catatan = ? WHERE id = ?`,
      [newStatus, catatan || '', withdrawalId]
    );

    await connection.commit();
    const [updatedWd] = await pool.execute('SELECT * FROM withdrawal_requests WHERE id = ?', [withdrawalId]);
    return { success: true, message: `Pengajuan berhasil di${approved ? 'setujui' : 'tolak'}`, status: newStatus, withdrawal: updatedWd[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── GET WITHDRAWAL REQUESTS ─────────────────────────────────────────────────
export const getWithdrawalRequests = async (filters = {}) => {
  try {
    let query = `
      SELECT wr.*, u.nama as user_nama, u.username, b.name as branch_name
      FROM withdrawal_requests wr
      LEFT JOIN users u ON u.id = wr.user_id
      LEFT JOIN branches b ON b.id = wr.branch_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.id) { query += ` AND wr.id = ?`; params.push(filters.id); }
    if (filters.userId) { query += ` AND wr.user_id = ?`; params.push(filters.userId); }
    if (filters.branchId) { query += ` AND wr.branch_id = ?`; params.push(filters.branchId); }
    if (filters.status) { query += ` AND wr.status = ?`; params.push(filters.status); }
    if (filters.dateFrom) { query += ` AND wr.tanggal >= ?`; params.push(filters.dateFrom); }
    if (filters.dateTo) { query += ` AND wr.tanggal <= ?`; params.push(filters.dateTo); }

    query += ' ORDER BY wr.tanggal DESC, wr.created_at DESC';
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// ─── GET MUTATION HISTORY (unified ledger) ────────────────────────────────────
export const getMutationHistory = async (filters = {}) => {
  const { userId, branchId, dateFrom, dateTo } = filters;
  try {
    const condComm = [];
    const condMut = [];
    const paramsComm = [];
    const paramsMut = [];

    if (userId) {
      condComm.push('c.user_id = ?'); paramsComm.push(userId);
      condMut.push('cm.user_id = ?'); paramsMut.push(userId);
    }
    if (branchId) {
      condComm.push('c.branch_id = ?'); paramsComm.push(branchId);
      condMut.push('cm.branch_id = ?'); paramsMut.push(branchId);
    }
    if (dateFrom) {
      condComm.push('c.period_start >= ?'); paramsComm.push(dateFrom);
      condMut.push('cm.tanggal >= ?'); paramsMut.push(dateFrom);
    }
    if (dateTo) {
      condComm.push('c.period_start <= ?'); paramsComm.push(dateTo);
      condMut.push('cm.tanggal <= ?'); paramsMut.push(dateTo);
    }

    const whereComm = condComm.length ? `AND ${condComm.join(' AND ')}` : '';
    const whereMut = condMut.length ? `AND ${condMut.join(' AND ')}` : '';

    const query = `
      SELECT c.id, c.user_id, u1.nama as user_nama, c.branch_id, b1.name as branch_name,
             c.period_start as tanggal, 'masuk' as tipe, c.commission_amount as nominal,
             NULL as metode, NULL as saldo_setelah,
             CONCAT('Komisi Otomatis (', DATE_FORMAT(c.period_start, '%d/%m/%Y'), ')') as keterangan,
             c.created_at, 0 as is_manual, NULL as withdrawal_id
      FROM commissions c
      LEFT JOIN users u1 ON u1.id = c.user_id
      LEFT JOIN branches b1 ON b1.id = c.branch_id
      WHERE 1=1 ${whereComm}

      UNION ALL

      SELECT cm.id, cm.user_id, u2.nama as user_nama, cm.branch_id, b2.name as branch_name,
             cm.tanggal, cm.tipe, cm.nominal,
             cm.metode, cm.saldo_setelah, cm.keterangan,
             cm.created_at, 1 as is_manual, NULL as withdrawal_id
      FROM commission_mutations cm
      LEFT JOIN users u2 ON u2.id = cm.user_id
      LEFT JOIN branches b2 ON b2.id = cm.branch_id
      WHERE 1=1 ${whereMut}

      ORDER BY tanggal DESC, created_at DESC
    `;

    const [rows] = await pool.execute(query, [...paramsComm, ...paramsMut]);
    return rows;
  } catch (error) {
    throw error;
  }
};

// ─── GET DAILY SUMMARY grouped by tanggal + metode (for pivot table) ─────────
export const getDailyMutationSummary = async (filters = {}) => {
  const { branchId, dateFrom, dateTo } = filters;
  try {
    const cond = [];
    const params = [];

    // tipe keluar only (kas outflow for reconciliation)
    cond.push("tipe = 'keluar'");

    if (dateFrom) { cond.push('tanggal >= ?'); params.push(dateFrom); }
    if (dateTo) { cond.push('tanggal <= ?'); params.push(dateTo); }

    // In branch mode: only show kas for that specific branch kas register
    // e.g. branchId='UTM' → metode='kas_utm'
    if (branchId) {
      cond.push('metode = ?');
      params.push(`kas_${branchId.toLowerCase()}`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const KNOWN_TRANSFERS = `'transfer_bca','transfer_bri','transfer_mandiri','transfer_bni','emoney'`;

    const query = `
      SELECT
        tanggal,
        CASE 
          WHEN metode LIKE 'kas_%' THEN metode
          WHEN metode IN (${KNOWN_TRANSFERS}) THEN metode 
          ELSE 'lainnya' 
        END as metode,
        SUM(nominal) as total
      FROM commission_mutations
      ${where}
      GROUP BY tanggal, 
               CASE 
                 WHEN metode LIKE 'kas_%' THEN metode
                 WHEN metode IN (${KNOWN_TRANSFERS}) THEN metode 
                 ELSE 'lainnya' 
               END
      ORDER BY tanggal DESC, metode ASC
    `;

    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

// ─── CREATE MANUAL MUTATION (Admin/HRD) ──────────────────────────────────────
export const createManualMutation = async (data) => {
  const { userId, branchId, nominal, metode, keterangan, tipe = 'keluar', tanggal } = data;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (tipe === 'keluar') {
      const [userRows] = await connection.execute('SELECT saldo_awal FROM users WHERE id = ?', [userId]);
      const saldoAwal = parseFloat(userRows[0]?.saldo_awal || 0);

      const [commRows] = await connection.execute(
        'SELECT SUM(commission_amount) as total FROM commissions WHERE user_id = ?',
        [userId]
      );
      const [mutRows] = await connection.execute(
        `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net FROM commission_mutations WHERE user_id = ?`,
        [userId]
      );
      const balance = saldoAwal + parseFloat(commRows[0]?.total || 0) + parseFloat(mutRows[0]?.net || 0);
      if (nominal > balance) throw new Error(`Saldo tidak cukup. Tersedia: ${balance}`);
    }

    // Recalculate saldo_setelah
    const [userRows2] = await connection.execute('SELECT saldo_awal FROM users WHERE id = ?', [userId]);
    const saldoAwal2 = parseFloat(userRows2[0]?.saldo_awal || 0);

    const [balRows] = await connection.execute(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net FROM commission_mutations WHERE user_id = ?`,
      [userId]
    );
    const [commRows2] = await connection.execute(
      'SELECT SUM(commission_amount) as total FROM commissions WHERE user_id = ?',
      [userId]
    );
    const currentBal = saldoAwal2 + parseFloat(commRows2[0]?.total || 0) + parseFloat(balRows[0]?.net || 0);
    const saldoSetelah = tipe === 'masuk' ? currentBal + parseFloat(nominal) : currentBal - parseFloat(nominal);

    const id = uuidv4();
    await connection.execute(
      `INSERT INTO commission_mutations (id, user_id, branch_id, tanggal, tipe, nominal, metode, saldo_setelah, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, branchId, tanggal || new Date().toISOString().slice(0, 10), tipe, nominal, metode, saldoSetelah, keterangan]
    );

    await connection.commit();
    const [newMut] = await pool.execute('SELECT * FROM commission_mutations WHERE id = ?', [id]);
    return { success: true, mutation: newMut[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── UPDATE MANUAL MUTATION (Admin/HRD) ──────────────────────────────────────
export const updateManualMutation = async (id, data) => {
  try {
    const { nominal, metode, keterangan, tanggal } = data;
    await pool.execute(
      `UPDATE commission_mutations SET nominal = ?, metode = ?, keterangan = ?, tanggal = ? WHERE id = ?`,
      [nominal, metode, keterangan, tanggal, id]
    );
    const [rows] = await pool.execute('SELECT * FROM commission_mutations WHERE id = ?', [id]);
    return { success: true, mutation: rows[0] };
  } catch (error) {
    throw error;
  }
};

// ─── DELETE MANUAL MUTATION (Admin/HRD) ──────────────────────────────────────
export const deleteManualMutation = async (id) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM commission_mutations WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error('Mutasi tidak ditemukan');
    await pool.execute('DELETE FROM commission_mutations WHERE id = ?', [id]);
    return { success: true, message: 'Mutasi berhasil dihapus' };
  } catch (error) {
    throw error;
  }
};

// ─── GET USER BALANCE ─────────────────────────────────────────────────────────
export const getUserBalance = async (userId, dateFrom, dateTo) => {
  try {
    const periodWhere = [];
    const periodParams = [userId];
    if (dateFrom) { periodWhere.push('period_start >= ?'); periodParams.push(dateFrom); }
    if (dateTo) { periodWhere.push('period_start <= ?'); periodParams.push(dateTo); }
    const periodCond = periodWhere.length ? `AND ${periodWhere.join(' AND ')}` : '';

    const mutPeriodWhere = [];
    const mutPeriodParams = [userId];
    if (dateFrom) { mutPeriodWhere.push('tanggal >= ?'); mutPeriodParams.push(dateFrom); }
    if (dateTo) { mutPeriodWhere.push('tanggal <= ?'); mutPeriodParams.push(dateTo); }
    const mutPeriodCond = mutPeriodWhere.length ? `AND ${mutPeriodWhere.join(' AND ')}` : '';

    // All-time totals
    const [userData] = await pool.execute('SELECT saldo_awal FROM users WHERE id = ?', [userId]);
    const saldoAwal = parseFloat(userData[0]?.saldo_awal || 0);

    const [allComm] = await pool.execute(
      'SELECT SUM(commission_amount) as total FROM commissions WHERE user_id = ?', [userId]
    );
    const [allMut] = await pool.execute(
      `SELECT
         SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) as total_masuk,
         SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as total_keluar
       FROM commission_mutations WHERE user_id = ?`, [userId]
    );

    // Period totals
    const [perComm] = await pool.execute(
      `SELECT SUM(commission_amount) as total FROM commissions WHERE user_id = ? ${periodCond}`, periodParams
    );
    const [perMut] = await pool.execute(
      `SELECT
         SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE 0 END) as total_masuk,
         SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END) as total_keluar
       FROM commission_mutations WHERE user_id = ? ${mutPeriodCond}`, mutPeriodParams
    );

    const totalKomisi = parseFloat(allComm[0]?.total || 0);
    const totalKeluar = parseFloat(allMut[0]?.total_keluar || 0);
    const periodKomisi = parseFloat(perComm[0]?.total || 0);
    const periodKeluar = parseFloat(perMut[0]?.total_keluar || 0);
    const netMutations = parseFloat(allMut[0]?.total_masuk || 0) - totalKeluar;

    return {
      // All-time
      saldoAwal,
      totalCommissions: totalKomisi,
      totalKeluar,
      availableBalance: saldoAwal + totalKomisi + netMutations,
      // Period (filtered)
      periodCommissions: periodKomisi,
      periodKeluar,
    };
  } catch (error) {
    throw error;
  }
};
