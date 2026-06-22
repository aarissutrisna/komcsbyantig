import crypto from 'crypto';
import pool from '../config/database.js';

/**
 * Get finance group info by key
 */
export const getGroupByKey = async (financeGroupKey) => {
  const [rows] = await pool.execute(
    `SELECT 
      b.finance_group_key,
      b.n8n_debt_endpoint as webhook_url,
      b.n8n_debt_secret as webhook_secret,
      GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR ', ') as branch_ids,
      COUNT(DISTINCT b.id) as branch_count,
      CASE 
        WHEN COUNT(DISTINCT b.id) > 1 THEN CONCAT(GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR '-'), ' Combined')
        ELSE MAX(b.name)
      END as group_name
    FROM branches b
    WHERE b.finance_group_key = ?
    GROUP BY b.finance_group_key, b.n8n_debt_endpoint, b.n8n_debt_secret`,
    [financeGroupKey]
  );
  return rows[0] || null;
};

/**
 * Get all finance groups (auto-derived from branches)
 */
export const getAllGroups = async () => {
  const [rows] = await pool.execute(
    `SELECT 
      b.finance_group_key,
      b.n8n_debt_endpoint as webhook_url,
      GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR ', ') as branch_ids,
      COUNT(DISTINCT b.id) as branch_count,
      CASE 
        WHEN COUNT(DISTINCT b.id) > 1 THEN CONCAT(GROUP_CONCAT(DISTINCT b.id ORDER BY b.id SEPARATOR '-'), ' Combined')
        ELSE MAX(b.name)
      END as group_name,
      fgs.opex_percent,
      fgs.safety_margin_percent,
      fgs.n_days_default
    FROM branches b
    LEFT JOIN finance_group_settings fgs ON b.finance_group_key = fgs.finance_group_key
    WHERE b.n8n_debt_endpoint IS NOT NULL
    GROUP BY b.finance_group_key, b.n8n_debt_endpoint, fgs.opex_percent, fgs.safety_margin_percent, fgs.n_days_default
    ORDER BY MIN(b.id)`
  );
  return rows;
};

/**
 * Get finance group settings
 */
export const getGroupSettings = async (financeGroupKey) => {
  const [rows] = await pool.execute(
    `SELECT * FROM finance_group_settings WHERE finance_group_key = ?`,
    [financeGroupKey]
  );
  return rows[0] || null;
};

/**
 * Update finance group settings
 */
export const updateGroupSettings = async (financeGroupKey, settings) => {
  const { opex_percent, safety_margin_percent, n_days_default, webhook_secret } = settings;
  
  // Get webhook URL from any branch in this group
  const [branchRows] = await pool.execute(
    `SELECT n8n_debt_endpoint FROM branches WHERE finance_group_key = ? LIMIT 1`,
    [financeGroupKey]
  );
  
  if (!branchRows[0]) {
    throw new Error('Finance group not found');
  }
  
  const webhook_url = branchRows[0].n8n_debt_endpoint;
  
  await pool.execute(
    `INSERT INTO finance_group_settings 
      (finance_group_key, webhook_url, webhook_secret, opex_percent, safety_margin_percent, n_days_default)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      webhook_secret = VALUES(webhook_secret),
      opex_percent = VALUES(opex_percent),
      safety_margin_percent = VALUES(safety_margin_percent),
      n_days_default = VALUES(n_days_default)`,
    [
      financeGroupKey,
      webhook_url,
      webhook_secret || null,
      opex_percent || 2.00,
      safety_margin_percent || 15.00,
      n_days_default || 90
    ]
  );
  
  // Auto-sync webhook_secret to all branches in this group
  if (webhook_secret !== undefined) {
    await pool.execute(
      `UPDATE branches SET n8n_debt_secret = ? WHERE finance_group_key = ?`,
      [webhook_secret, financeGroupKey]
    );
  }
  
  return { success: true };
};

/**
 * Generate finance group key from webhook URL
 */
export const generateGroupKey = (webhookUrl) => {
  return crypto.createHash('sha256').update(webhookUrl).digest('hex');
};

/**
 * Get branches in a finance group
 */
export const getBranchesInGroup = async (financeGroupKey) => {
  const [rows] = await pool.execute(
    `SELECT id, name, city, n8n_debt_endpoint, n8n_debt_secret
    FROM branches
    WHERE finance_group_key = ?
    ORDER BY id`,
    [financeGroupKey]
  );
  return rows;
};
