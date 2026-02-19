import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const loginUser = async (email, password) => {
  const [rows] = await pool.execute(
    'SELECT id, username, nama, email, password, role FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    throw new Error('User not found');
  }

  const user = rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      role: user.role,
    },
  };
};

export const getUserProfile = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT id, username, nama, email, role, branch_id, faktor_pengali, created_at FROM users WHERE id = ?',
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

export const getAllUsers = async () => {
  const [rows] = await pool.execute(
    'SELECT id, username, nama, email, role, branch_id, faktor_pengali, created_at FROM users'
  );
  return rows;
};

import { v4 as uuidv4 } from 'uuid';

export const createUser = async (userData) => {
  const { username, nama, email, password, role, branchId, faktorPengali } = userData;
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.execute(
    'INSERT INTO users (id, username, nama, email, password, role, branch_id, faktor_pengali) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, username, nama, email, hashedPassword, role, branchId || null, faktorPengali || 1.0]
  );

  return getUserProfile(id);
};

export const updateUser = async (id, userData) => {
  const { username, nama, email, password, role, branchId, faktorPengali } = userData;

  let query = 'UPDATE users SET username = ?, nama = ?, email = ?, role = ?, branch_id = ?, faktor_pengali = ?';
  let params = [username, nama, email, role, branchId || null, faktorPengali || 1.0];

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

export const deleteUser = async (id) => {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return { success: true };
};
