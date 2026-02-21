import * as n8nService from './n8nService.js';
import pool from '../config/database.js';

/**
 * Service for ephemeral preview of today's data
 */
export const getPreviewToday = async (branchId, scope = null) => {
    const today = new Date().toISOString().split('T')[0];

    if (branchId === 'all') {
        // Fetch all branches with N8N endpoints
        let query = 'SELECT id FROM branches WHERE n8n_endpoint IS NOT NULL AND n8n_endpoint != ""';
        const params = [];

        if (scope) {
            if (Array.isArray(scope)) {
                query += ` AND id IN (${scope.map(() => '?').join(',')})`;
                params.push(...scope);
            } else {
                query += ' AND id = ?';
                params.push(scope);
            }
        }

        const [branchRows] = await pool.execute(query, params);

        let totalCash = 0;
        let totalPiutang = 0;
        const results = [];

        for (const b of branchRows) {
            try {
                const n8nData = await n8nService.fetchFromBranch(b.id, {
                    startDate: today,
                    endDate: today
                });
                const todayData = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === today) || { cash: 0, piutang: 0 };

                const cash = parseFloat(todayData.cash || 0);
                const piutang = parseFloat(todayData.piutang || 0);
                const total = cash + piutang;

                totalCash += cash;
                totalPiutang += piutang;

                // Save to cache
                await pool.execute(
                    `INSERT INTO n8n_live_cache (branch_id, tanggal, cash, piutang, total, last_fetched_at)
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON DUPLICATE KEY UPDATE cash=VALUES(cash), piutang=VALUES(piutang), total=VALUES(total), last_fetched_at=CURRENT_TIMESTAMP`,
                    [b.id, today, cash, piutang, total]
                );

                results.push({
                    branchId: b.id,
                    cash,
                    piutang,
                    total
                });
            } catch (err) {
                console.error(`[getPreviewToday] Failed for branch ${b.id}:`, err.message);
            }
        }

        return {
            branchId: 'all',
            tanggal: today,
            cash: totalCash,
            piutang: totalPiutang,
            total: totalCash + totalPiutang,
            is_preview: true,
            details: results
        };
    }

    // Fetch from N8N with 00:00 - now range
    const n8nData = await n8nService.fetchFromBranch(branchId, {
        startDate: today,
        endDate: today
    });

    const todayData = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === today) || { cash: 0, piutang: 0 };
    const cash = parseFloat(todayData.cash || 0);
    const piutang = parseFloat(todayData.piutang || 0);
    const total = cash + piutang;

    // Save to cache
    await pool.execute(
        `INSERT INTO n8n_live_cache (branch_id, tanggal, cash, piutang, total, last_fetched_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE cash=VALUES(cash), piutang=VALUES(piutang), total=VALUES(total), last_fetched_at=CURRENT_TIMESTAMP`,
        [branchId, today, cash, piutang, total]
    );

    return {
        branchId,
        tanggal: today,
        cash,
        piutang,
        total,
        is_preview: true
    };
};
