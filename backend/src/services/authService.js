import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';

export const loginUser = async (username, password) => {
  const [rows] = await pool.execute(
    'SELECT id, username, nama, email, password, role, branch_id, is_active FROM users WHERE username = ?',
    [username]
  );

  if (rows.length === 0) {
    throw new Error('User not found');
  }

  const user = rows[0];

  if (!user.is_active) {
    throw new Error('Akun ini sudah dinonaktifkan. Hubungi Admin.');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || process.env.JWT_EXPIRES_IN || '12h' }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    },
  };
};

export const getUserProfile = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT id, username, nama, email, role, branch_id, faktor_pengali, saldo_awal, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (rows.length === 0) {
    throw new Error('User not found');
  }

  return rows[0];
};

export const changePassword = async (userId, oldPassword, newPassword) => {
  const [rows] = await pool.execute(
    'SELECT password FROM users WHERE id = ?',
    [userId]
  );

  if (rows.length === 0) {
    throw new Error('User not found');
  }

  const isValidPassword = await bcrypt.compare(oldPassword, rows[0].password);

  if (!isValidPassword) {
    throw new Error('Invalid old password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );

  return { message: 'Password changed successfully' };
};

export const getAllUsers = async (branchId = null, includeInactive = true) => {
  let query = 'SELECT DISTINCT u.id, u.username, u.nama, u.email, u.role, u.branch_id, u.faktor_pengali, u.saldo_awal, u.is_active, u.resign_date, u.created_at FROM users u';
  const params = [];
  const conds = [];

  if (branchId) {
    query += ' LEFT JOIN cs_penugasan p ON u.id = p.user_id';
    conds.push('(u.branch_id = ? OR p.cabang_id = ?)');
    params.push(branchId, branchId);
  }

  if (!includeInactive) {
    conds.push('u.is_active = 1');
  }

  if (conds.length) query += ' WHERE ' + conds.join(' AND ');

  const [rows] = await pool.execute(query, params);
  return rows;
};

export const createUser = async (userData) => {
  const { username, nama, email, password, role, branchId, faktorPengali } = userData;
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.execute(
    'INSERT INTO users (id, username, nama, email, password, role, branch_id, faktor_pengali, saldo_awal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, username, nama, email, hashedPassword, role, branchId || null, parseFloat(faktorPengali || 1.0), parseFloat(userData.saldoAwal || 0)]
  );

  return getUserProfile(id);
};

export const updateUser = async (id, userData) => {
  const { username, nama, email, password, role, branchId, faktorPengali } = userData;

  let query = 'UPDATE users SET username = ?, nama = ?, email = ?, role = ?, branch_id = ?, faktor_pengali = ?, saldo_awal = ?';
  let params = [username, nama, email, role, branchId || null, parseFloat(faktorPengali || 1.0), parseFloat(userData.saldoAwal || 0)];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    query += ', password = ?';
    params.push(hashedPassword);
  }

  query += ' WHERE id = ?';
  params.push(id);

  await pool.execute(query, params);
  return getUserProfile(id);
};

// ─── DELETE USER (Constrained) ────────────────────────────────────────────────
export const deleteUser = async (id) => {
  // Check for any existing relations that should prevent hard delete
  const tablesToCheck = [
    { name: 'commissions', label: 'Histori Komisi' },
    { name: 'cs_penugasan', label: 'Histori Penugasan' },
    { name: 'commission_mutations', label: 'Histori Mutasi' },
    { name: 'attendance_data', label: 'Data Kehadiran' },
    { name: 'withdrawal_requests', label: 'Permintaan Penarikan' }
  ];

  for (const table of tablesToCheck) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM ${table.name} WHERE user_id = ?`,
      [id]
    );
    if (rows[0].count > 0) {
      throw new Error(`Pengguna tidak dapat dihapus karena sudah memiliki ${table.label}. Silakan gunakan menu 'Nonaktifkan (Resign)' saja.`);
    }
  }

  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return { success: true };
};

// ─── RESIGN USER ──────────────────────────────────────────────────────────────
export const resignUser = async (userId, resignDate) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Disable login & set resign date
    await conn.execute(
      'UPDATE users SET is_active = 0, resign_date = ? WHERE id = ?',
      [resignDate, userId]
    );

    // 2. Close all open penugasan (tanggal_selesai = resignDate)
    await conn.execute(
      `UPDATE cs_penugasan
       SET tanggal_selesai = ?
       WHERE user_id = ? AND (tanggal_selesai IS NULL OR tanggal_selesai > ?)`,
      [resignDate, userId, resignDate]
    );

    await conn.commit();
    return { success: true, message: 'User berhasil dinonaktifkan' };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ─── REACTIVATE USER (undo resign) ───────────────────────────────────────────
export const reactivateUser = async (userId) => {
  await pool.execute(
    'UPDATE users SET is_active = 1, resign_date = NULL WHERE id = ?',
    [userId]
  );
  return { success: true, message: 'User berhasil diaktifkan kembali' };
};
