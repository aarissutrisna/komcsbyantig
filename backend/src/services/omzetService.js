import pool from '../config/database.js';
import * as commissionsService from './commissionsService.js';
import { v4 as uuidv4 } from 'uuid'; // I'll need to add uuid to package.json dependencies

export const createOmzet = async (userId, branchId, amount, date, description) => {
  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO omzet (id, user_id, branch_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, branchId, amount, date, description]
    );

    const [rows] = await pool.execute('SELECT * FROM omzet WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    throw error;
  }
};

export const getOmzetByDate = async (date) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM omzet WHERE date = ? ORDER BY branch_id',
      [date]
    );
    return rows;
  } catch (error) {
    throw error;
  }
};

export const getOmzetByBranch = async (branchId, startDate, endDate) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM omzet WHERE branch_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
      [branchId, startDate, endDate]
    );
    return rows;
  } catch (error) {
    throw error;
  }
};

export const getOmzetByUser = async (userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM omzet WHERE user_id = ? ORDER BY date DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    throw error;
  }
};

export const getOmzetStats = async (branchId, month, year) => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;

    const [rows] = await pool.execute(
      `SELECT
        SUM(amount) as total_omzet,
        COUNT(*) as count,
        AVG(amount) as average,
        MIN(amount) as min,
        MAX(amount) as max
       FROM omzet
       WHERE branch_id = ? AND date LIKE ?`,
      [branchId, `${datePrefix}%`]
    );

    return rows[0];
  } catch (error) {
    throw error;
  }
};

function convertDateFormat(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const patterns = [
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, format: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, format: (m) => `${m[1]}-${m[2]}-${m[3]}` },
  ];

  for (const { regex, format } of patterns) {
    const match = dateStr.match(regex);
    if (match) {
      return format(match);
    }
  }

  return dateStr;
}

export const syncOmzetFromN8N = async (branchId, omzetItems) => {
  try {
    const omzetData = omzetItems.map((item) => ({
      branchId: branchId,
      tanggal: convertDateFormat(item.tanggal),
      cash: item.cash || 0,
      piutang: item.piutang || 0,
      total: (item.cash || 0) + (item.piutang || 0),
    }));

    const results = [];
    for (const item of omzetData) {
      const id = uuidv4();
      await pool.execute(
        `INSERT INTO omzet (id, branch_id, amount, date, description)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = ?`,
        [id, item.branchId, item.total, item.tanggal, `Cash: ${item.cash}, Piutang: ${item.piutang}`, item.total]
      );

      const [rows] = await pool.execute('SELECT * FROM omzet WHERE branch_id = ? AND date = ?', [item.branchId, item.tanggal]);
      results.push(rows[0]);
    }

    await pool.execute(
      'UPDATE branches SET last_sync_at = NOW() WHERE id = ?',
      [branchId]
    );

    return results;
  } catch (error) {
    throw error;
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
