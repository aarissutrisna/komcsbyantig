import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const createWithdrawalRequest = async (userId, nominal) => {
  try {
    const [commRows] = await pool.execute(
      'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = ? AND status = ?',
      [userId, 'paid']
    );

    const totalKomisi = commRows[0]?.total_komisi || 0;

    const [mutRows] = await pool.execute(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
       FROM commission_mutations
       WHERE user_id = ?`,
      [userId]
    );

    const totalMutations = mutRows[0]?.net_mutations || 0;
    const availableBalance = parseFloat(totalKomisi) + parseFloat(totalMutations);

    if (nominal > availableBalance) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Requested: ${nominal}`);
    }

    const [userRows] = await pool.execute(
      'SELECT branch_id FROM users WHERE id = ?',
      [userId]
    );

    const branchId = userRows[0]?.branch_id;
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO withdrawal_requests (id, user_id, branch_id, nominal, status, tanggal)
       VALUES (?, ?, ?, ?, ?, CURRENT_DATE)`,
      [id, userId, branchId, nominal, 'pending']
    );

    const [newWd] = await pool.execute('SELECT * FROM withdrawal_requests WHERE id = ?', [id]);

    return {
      success: true,
      message: 'Withdrawal request created',
      availableBalance: availableBalance,
      withdrawal: newWd[0],
    };
  } catch (error) {
    throw error;
  }
};

export const approveWithdrawalRequest = async (withdrawalId, approved, catatan) => {
  try {
    const [wdRows] = await pool.execute(
      'SELECT * FROM withdrawal_requests WHERE id = ?',
      [withdrawalId]
    );

    if (wdRows.length === 0) {
      throw new Error('Withdrawal request not found');
    }

    const withdrawal = wdRows[0];
    const newStatus = approved ? 'approved' : 'rejected';

    await pool.execute(
      `UPDATE withdrawal_requests
       SET status = ?, catatan = ?
       WHERE id = ?`,
      [newStatus, catatan || '', withdrawalId]
    );

    if (approved) {
      const mutId = uuidv4();
      await pool.execute(
        `INSERT INTO commission_mutations (id, user_id, branch_id, tanggal, tipe, nominal, keterangan)
         VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?)`,
        [
          mutId,
          withdrawal.user_id,
          withdrawal.branch_id,
          'keluar',
          withdrawal.nominal,
          `Penarikan komisi - ${catatan || ''}`,
        ]
      );
    }

    const [updatedWd] = await pool.execute('SELECT * FROM withdrawal_requests WHERE id = ?', [withdrawalId]);

    return {
      success: true,
      message: `Withdrawal request ${newStatus}`,
      status: newStatus,
      withdrawal: updatedWd[0],
    };
  } catch (error) {
    throw error;
  }
};

export const getWithdrawalRequests = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM withdrawal_requests WHERE 1 = 1';
    const params = [];

    if (filters.userId) {
      query += ` AND user_id = ?`;
      params.push(filters.userId);
    }

    if (filters.branchId) {
      query += ` AND branch_id = ?`;
      params.push(filters.branchId);
    }

    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    query += ' ORDER BY tanggal DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    throw error;
  }
};

export const getUserBalance = async (userId) => {
  try {
    const [commRows] = await pool.execute(
      'SELECT SUM(commission_amount) as total_komisi FROM commissions WHERE user_id = ? AND status = ?',
      [userId, 'paid']
    );

    const totalKomisi = commRows[0]?.total_komisi || 0;

    const [mutRows] = await pool.execute(
      `SELECT SUM(CASE WHEN tipe = 'masuk' THEN nominal ELSE -nominal END) as net_mutations
       FROM commission_mutations
       WHERE user_id = ?`,
      [userId]
    );

    const totalMutations = mutRows[0]?.net_mutations || 0;

    return {
      totalCommissions: parseFloat(totalKomisi),
      totalMutations: parseFloat(totalMutations),
      availableBalance: parseFloat(totalKomisi) + parseFloat(totalMutations),
    };
  } catch (error) {
    throw error;
  }
};
