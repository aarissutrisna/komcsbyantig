import pool from '../config/database.js';
import * as n8nService from './n8nService.js';
import * as commissionsService from './commissionsService.js';
import * as auditService from './auditService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get comparison between DB and N8N for a specific date
 */
export const getUpdateComparison = async (branchId, tanggal) => {
    // 1. Get from DB (Aggregate for branch comparison)
    // In the new structure, we can sum the unique branch totals or just pick one
    const [dbRows] = await pool.execute(
        'SELECT cash, bayar_piutang, total, description, source, is_final, last_synced_at FROM omzet WHERE branch_id = ? AND date = ? LIMIT 1',
        [branchId, tanggal]
    );

    // 2. Fetch from N8N
    const n8nData = await n8nService.fetchFromBranch(branchId, { startDate: tanggal, endDate: tanggal });
    const latest = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === tanggal);

    const oldData = dbRows.length > 0 ? {
        cash: parseFloat(dbRows[0].cash || 0),
        piutang: parseFloat(dbRows[0].bayar_piutang || 0),
        total: parseFloat(dbRows[0].total || 0),
        description: dbRows[0].description
    } : null;

    const newData = latest ? {
        cash: parseFloat(latest.cash || 0),
        piutang: parseFloat(latest.piutang || 0),
        total: parseFloat(latest.cash || 0) + parseFloat(latest.piutang || 0),
        description: `Cash: ${latest.cash}, Piutang: ${latest.piutang}`
    } : null;

    return {
        oldData,
        newData,
        canUpdate: !!newData
    };
};

/**
 * Perform the controlled update
 */
export const performControlledUpdate = async (userId, branchId, tanggal) => {
    const comparison = await getUpdateComparison(branchId, tanggal);

    if (!comparison.canUpdate) {
        throw new Error('No data found in N8N for this date to update.');
    }

    const { newData } = comparison;

    // Save single record per branch per date (branch-level data)
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const id = uuidv4();
        await connection.execute(
            `INSERT INTO omzet (id, user_id, branch_id, date, cash, bayar_piutang, total, description, source, is_final, last_synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE 
             cash = VALUES(cash), 
             bayar_piutang = VALUES(bayar_piutang), 
             total = VALUES(total),
             description = VALUES(description),
             source = VALUES(source),
             is_final = VALUES(is_final),
             last_synced_at = CURRENT_TIMESTAMP`,
            [id, userId, branchId, tanggal, newData.cash, newData.piutang, newData.total, newData.description, 'MANUAL_UPDATE', true]
        );

        // Audit Log
        await auditService.recordLog({
            userId,
            action: 'MANUAL_OMZET_UPDATE',
            entity: 'omzet',
            entityId: branchId,
            details: {
                date: tanggal,
                branch_id: branchId,
                total: newData.total
            }
        });

        await connection.commit();

        // Trigger recalculation
        await commissionsService.calculateCommissionByDate(branchId, tanggal);

        return { success: true, message: 'Data updated and commissions recalculated.' };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
