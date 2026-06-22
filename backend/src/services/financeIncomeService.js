import pool from '../config/database.js';

/**
 * Calculate average daily revenue for a finance group
 * Uses the `total` field from omzet table (= cash + bayar_piutang)
 */
export const getAvgDailyRevenue = async (financeGroupKey, windowDays = 30) => {
  // PENTING: harus SUM per hari dulu (akumulasi semua cabang dalam group),
  // baru AVG dari total harian. Jika langsung AVG(total), omzet UTM & JTJ
  // dirata-rata per row bukan per hari gabungan.
  const [rows] = await pool.execute(
    `SELECT AVG(daily_total) as avg_revenue
    FROM (
      SELECT o.date, SUM(o.total) as daily_total
      FROM omzet o
      WHERE o.branch_id IN (
        SELECT b.id FROM branches b WHERE b.finance_group_key = ?
      )
      AND o.date >= CURDATE() - INTERVAL ? DAY
      AND o.total > 0
      GROUP BY o.date
    ) as daily_sums`,
    [financeGroupKey, windowDays]
  );
  
  return rows[0]?.avg_revenue || 0;
};

/**
 * Get daily revenue history for a finance group
 */
export const getDailyRevenueHistory = async (financeGroupKey, days = 90) => {
  const [rows] = await pool.execute(
    `SELECT 
      o.date,
      o.branch_id,
      b.name as branch_name,
      o.cash,
      o.bayar_piutang,
      o.total
    FROM omzet o
    JOIN branches b ON b.id = o.branch_id
    WHERE o.branch_id IN (
      SELECT b2.id FROM branches b2 WHERE b2.finance_group_key = ?
    )
    AND o.date >= CURDATE() - INTERVAL ? DAY
    ORDER BY o.date DESC, o.branch_id`,
    [financeGroupKey, days]
  );
  
  return rows;
};

/**
 * Get monthly revenue stats for a finance group
 */
export const getMonthlyRevenueStats = async (financeGroupKey, months = 12) => {
  const [rows] = await pool.execute(
    `SELECT 
      month,
      SUM(daily_total) as total_revenue,
      AVG(daily_total) as avg_daily,
      COUNT(*) as days_count
    FROM (
      SELECT 
        DATE_FORMAT(o.date, '%Y-%m') as month,
        o.date,
        SUM(o.total) as daily_total
      FROM omzet o
      WHERE o.branch_id IN (
        SELECT b.id FROM branches b WHERE b.finance_group_key = ?
      )
      AND o.date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(o.date, '%Y-%m'), o.date
    ) as daily_sums
    GROUP BY month
    ORDER BY month DESC`,
    [financeGroupKey, months]
  );
  
  return rows;
};

/**
 * Get total revenue for a specific date range
 */
export const getTotalRevenue = async (financeGroupKey, startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
      SUM(o.total) as total_revenue,
      SUM(o.cash) as total_cash,
      SUM(o.bayar_piutang) as total_piutang,
      COUNT(DISTINCT o.date) as days_count
    FROM omzet o
    WHERE o.branch_id IN (
      SELECT b.id FROM branches b WHERE b.finance_group_key = ?
    )
    AND o.date BETWEEN ? AND ?`,
    [financeGroupKey, startDate, endDate]
  );
  
  return rows[0] || { total_revenue: 0, total_cash: 0, total_piutang: 0, days_count: 0 };
};
