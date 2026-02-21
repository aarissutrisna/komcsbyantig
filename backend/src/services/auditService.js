import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to record system audit logs
 */
export const recordLog = async ({ userId, action, entity, entityId, ipAddress, details }) => {
    try {
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, ip_address, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                userId || null,
                action,
                entity,
                entityId || null,
                ipAddress || null,
                details ? JSON.stringify(details) : null
            ]
        );
        return { success: true, id };
    } catch (error) {
        console.error('Audit Log recording failed:', error);
        // We don't throw here to prevent breaking the main flow if logging fails
        return { success: false, error: error.message };
    }
};
