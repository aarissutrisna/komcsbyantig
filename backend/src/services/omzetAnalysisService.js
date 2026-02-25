import pool from '../config/database.js';

/**
 * Service for calculating omzet statistics and aggregation
 */

const calculateMedian = (values) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[half];
    return (sorted[half - 1] + sorted[half]) / 2.0;
};

export const rebuildAggregation = async (year, month, branchId = null) => {
    const conn = await pool.getConnection();
    try {
        let query = `
      SELECT branch_id, date, total 
      FROM omzet 
      WHERE YEAR(date) = ? AND MONTH(date) = ?
    `;
        const params = [year, month];

        if (branchId) {
            query += " AND branch_id = ?";
            params.push(branchId);
        }

        const [rows] = await conn.execute(query, params);

        // Group by branch
        const branchData = {};
        rows.forEach(r => {
            if (!branchData[r.branch_id]) branchData[r.branch_id] = [];
            branchData[r.branch_id].push(parseFloat(r.total));
        });

        for (const [bid, values] of Object.entries(branchData)) {
            const total = values.reduce((a, b) => a + b, 0);
            const avg = total / values.length;
            const median = calculateMedian(values);
            const min = Math.min(...values);
            const max = Math.max(...values);

            // Get branch targets for win rate calculation
            const [targets] = await conn.execute(
                "SELECT min_omzet, max_omzet FROM omzetbulanan WHERE branch_id = ? AND year = ? AND month = ?",
                [bid, year, month]
            );

            let winRateMax = 0;
            let winRateMin = 0;

            if (targets.length > 0) {
                const tMin = parseFloat(targets[0].min_omzet);
                const tMax = parseFloat(targets[0].max_omzet);
                const hitsMax = values.filter(v => v >= tMax).length;
                const hitsMin = values.filter(v => v >= tMin).length;
                winRateMax = (hitsMax / values.length) * 100;
                winRateMin = (hitsMin / values.length) * 100;
            }

            await conn.execute(`
        INSERT INTO omzet_stats_monthly 
          (branch_id, year, month, total_omzet, avg_daily, median_daily, min_daily, max_daily, win_rate_max, win_rate_min, days_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          total_omzet = VALUES(total_omzet),
          avg_daily = VALUES(avg_daily),
          median_daily = VALUES(median_daily),
          min_daily = VALUES(min_daily),
          max_daily = VALUES(max_daily),
          win_rate_max = VALUES(win_rate_max),
          win_rate_min = VALUES(win_rate_min),
          days_count = VALUES(days_count)
      `, [bid, year, month, total, avg, median, min, max, winRateMax, winRateMin, values.length]);
        }

        return { success: true, processedBranches: Object.keys(branchData).length };
    } finally {
        conn.release();
    }
};

export const getHistoricalTrends = async (branchId) => {
    const [rows] = await pool.execute(`
    SELECT year, month, total_omzet, avg_daily, median_daily, win_rate_max, win_rate_min 
    FROM omzet_stats_monthly 
    WHERE branch_id = ? 
    ORDER BY year DESC, month DESC 
    LIMIT 60
  `, [branchId]);
    return rows;
};

export const simulateTargets = async (branchId, year, month, minTarget, maxTarget) => {
    const [rows] = await pool.execute(`
    SELECT total FROM omzet 
    WHERE branch_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
  `, [branchId, year, month]);

    if (rows.length === 0) return null;

    const values = rows.map(r => parseFloat(r.total));
    const hitsMax = values.filter(v => v >= maxTarget).length;
    const hitsMin = values.filter(v => v >= minTarget).length;

    return {
        period: `${year}-${month}`,
        daysCount: values.length,
        hitsMax,
        hitsMin,
        winRateMax: (hitsMax / values.length) * 100,
        winRateMin: (hitsMin / values.length) * 100,
        avgDaily: values.reduce((a, b) => a + b, 0) / values.length,
        medianDaily: calculateMedian(values)
    };
};

export const importLegacyOmzet = async (data) => {
    // Expected structure: [{ branch_id, date, total }]
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of data) {
            await conn.execute(
                "INSERT INTO omzet (id, branch_id, date, total) VALUES (UUID(), ?, ?, ?) ON DUPLICATE KEY UPDATE total = VALUES(total)",
                [item.branch_id, item.date, item.total]
            );
        }
        await conn.commit();
        return { success: true, count: data.length };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
