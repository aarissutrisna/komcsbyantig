import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import * as commissionsService from './commissionsService.js';
import * as auditService from './auditService.js';

export const getMonthlyTarget = async (branchId, month, year) => {
    const [rows] = await pool.execute(
        'SELECT * FROM omzetbulanan WHERE branch_id = ? AND month = ? AND year = ?',
        [branchId, month, year]
    );

    if (rows.length > 0) return rows[0];

    // If not found, get default from branch settings
    const [branchRows] = await pool.execute(
        'SELECT target_min, target_max FROM branches WHERE id = ?',
        [branchId]
    );

    if (branchRows.length === 0) return null;

    return {
        branch_id: branchId,
        month,
        year,
        min_omzet: branchRows[0].target_min,
        max_omzet: branchRows[0].target_max,
        is_default: true
    };
};

export const saveMonthlyTarget = async (userId, targetData) => {
    const { branchId, month, year, min_omzet, max_omzet } = targetData;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.execute(
            'SELECT min_omzet, max_omzet FROM omzetbulanan WHERE branch_id = ? AND month = ? AND year = ?',
            [branchId, month, year]
        );

        // 1. Upsert omzetbulanan
        const id = uuidv4();
        await connection.execute(
            `INSERT INTO omzetbulanan (id, branch_id, month, year, min_omzet, max_omzet, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       min_omzet = VALUES(min_omzet), 
       max_omzet = VALUES(max_omzet), 
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
            [id, branchId, month, year, min_omzet, max_omzet, userId]
        );

        // 2. Remove snapshots from omzet table is no longer needed 
        // as calculation is now dynamic.
        const monthStr = String(month).padStart(2, '0');
        const datePrefix = `${year}-${monthStr}`;

        // 3. Clear and Recalculate Commissions
        // Requirement: "Hapus komisi bulan tersebut", "Recalculate komisi bulan tersebut"
        await connection.execute(
            'DELETE FROM commissions WHERE branch_id = ? AND period_start LIKE ?',
            [branchId, `${datePrefix}%`]
        );

        const [omzetRecords] = await connection.execute(
            'SELECT id, branch_id, date, user_id FROM omzet WHERE branch_id = ? AND date LIKE ?',
            [branchId, `${datePrefix}%`]
        );

        for (const row of omzetRecords) {
            // Updated calculation logic will be in commissionsService
            await commissionsService.recalculateCommissionsForDateInternal(connection, branchId, row.date);
        }

        // 4. Audit Log
        await auditService.recordLog({
            userId,
            action: 'UPDATE_MONTHLY_TARGET',
            entity: 'omzetbulanan',
            entityId: branchId,
            details: {
                branchId, month, year,
                old: existing.length > 0 ? existing[0] : 'DEFAULT_BRANCH',
                new: { min_omzet, max_omzet }
            }
        });

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
