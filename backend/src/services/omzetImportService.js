import pool from '../config/database.js';
import * as n8nService from './n8nService.js';
import * as commissionsService from './commissionsService.js';
import * as auditService from './auditService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for Historical Data Import
 */
export const importHistoricalData = async (adminUserId, branchId, startDate, endDate, isOverride = false) => {
    const connection = await pool.getConnection();
    try {
        // Generate list of dates between start and end
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d).toISOString().split('T')[0]);
        }

        let recordsProcessed = 0;

        // 1. Pre-populate omzetbulanan for the range
        // Find all unique month/year combinations in the range
        const monthsInRange = [];
        let cur = new Date(start);
        while (cur <= end) {
            const m = cur.getMonth() + 1;
            const y = cur.getFullYear();
            if (!monthsInRange.find(item => item.month === m && item.year === y)) {
                monthsInRange.push({ month: m, year: y });
            }
            cur.setMonth(cur.getMonth() + 1);
            cur.setDate(1); // Set to start of month for safety
        }

        // Fetch branch defaults
        const [branchRows] = await connection.execute('SELECT target_min, target_max FROM branches WHERE id = ?', [branchId]);
        const branchMin = branchRows[0]?.target_min || 0;
        const branchMax = branchRows[0]?.target_max || 0;

        for (const { month, year } of monthsInRange) {
            await connection.execute(
                `INSERT INTO omzetbulanan (id, branch_id, month, year, min_omzet, max_omzet, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE updated_at = updated_at`, // Only insert if not exists
                [uuidv4(), branchId, month, year, branchMin, branchMax, adminUserId]
            );
        }

        // 2. Fetch data from N8N for the whole range first
        const n8nData = await n8nService.fetchFromBranch(branchId, { startDate, endDate });

        for (const date of dates) {
            await connection.beginTransaction();

            try {
                const item = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === date);
                const cash = item?.cash || 0;
                const piutang = item?.piutang || 0;
                const total = parseFloat(cash) + parseFloat(piutang);
                const description = item ? `Cash: ${item.cash}, Piutang: ${item.piutang}` : 'No data from N8N';

                if (isOverride) {
                    await connection.execute('DELETE FROM commissions WHERE branch_id = ? AND period_start = ?', [branchId, date]);
                    await connection.execute('DELETE FROM omzet WHERE branch_id = ? AND date = ?', [branchId, date]);
                }

                // Ensure default attendance 1.0 for all CS in branch if not exists
                const [csUsers] = await connection.execute('SELECT id FROM users WHERE branch_id = ? AND role = "cs"', [branchId]);
                for (const cs of csUsers) {
                    await connection.execute(
                        `INSERT INTO attendance_data (id, user_id, branch_id, tanggal, kehadiran)
                         VALUES (?, ?, ?, ?, 1.0)
                         ON DUPLICATE KEY UPDATE kehadiran = kehadiran`, // Keep existing if exists
                        [uuidv4(), cs.id, branchId, date]
                    );
                }

                // Single record per branch per date, owned by the admin doing the import
                const id = uuidv4();
                await connection.execute(
                    `INSERT INTO omzet (id, user_id, branch_id, cash, bayar_piutang, total, date, description, source, is_final, last_synced_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON DUPLICATE KEY UPDATE cash = ?, bayar_piutang = ?, total = ?, description = ?, source = ?, last_synced_at = CURRENT_TIMESTAMP`,
                    [id, adminUserId, branchId, cash, piutang, total, date, description, 'IMPORT', true, cash, piutang, total, description, 'IMPORT']
                );

                await connection.commit();
                await commissionsService.calculateCommissionByDate(branchId, date);
                recordsProcessed++;
            } catch (error) {
                await connection.rollback();
                console.error(`Error importing data for ${date}:`, error);
            }
        }

        return {
            success: true,
            message: `Imported ${recordsProcessed} records.`,
            recordsProcessed
        };
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }
};
