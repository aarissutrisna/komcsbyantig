import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const loginUser = async (email, password) => {
  const result = await pool.query(
    'SELECT id, email, password, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];
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
      email: user.email,
      role: user.role,
    },
  };
};

export const getUserProfile = async (userId) => {
  const result = await pool.query(
    'SELECT id, email, role, branch_id, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
};

export const changePassword = async (userId, oldPassword, newPassword) => {
  const result = await pool.query(
    'SELECT password FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const isValidPassword = await bcrypt.compare(oldPassword, result.rows[0].password);

  if (!isValidPassword) {
    throw new Error('Invalid old password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [hashedPassword, userId]
  );

  return { message: 'Password changed successfully' };
};
