import pool from '../config/database.js';
import * as commissionsService from './commissionsService.js';
import * as auditService from './auditService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bulk Import Attendance from CSV
 * Format: TANGGAL;USERNAME;CABANG;KEHADIRAN
 */
export const importAttendanceCSV = async (adminUserId, csvData) => {
    const lines = csvData.split('\n').filter(line => line.trim().length > 0);
    const results = {
        success: 0,
        failed: [],
        total: lines.length
    };

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (let i = 0; i < lines.length; i++) {
            const [tanggalRaw, username, cabangName, kehadiranStr] = lines[i].split(';').map(s => s?.trim());

            if (!tanggalRaw || !username || !cabangName || !kehadiranStr) {
                results.failed.push({ row: i + 1, reason: 'Invalid format' });
                continue;
            }

            // 1. Resolve User
            const [userRows] = await connection.execute('SELECT id FROM users WHERE username = ?', [username]);
            if (userRows.length === 0) {
                results.failed.push({ row: i + 1, reason: `User ${username} not found` });
                continue;
            }
            const userId = userRows[0].id;

            // 2. Resolve Branch
            const [branchRows] = await connection.execute('SELECT id FROM branches WHERE name = ?', [cabangName]);
            if (branchRows.length === 0) {
                results.failed.push({ row: i + 1, reason: `Branch ${cabangName} not found` });
                continue;
            }
            const branchId = branchRows[0].id;

            // 3. Convert date (expecting DD/MM/YYYY or YYYY-MM-DD)
            let tanggal = tanggalRaw;
            if (tanggalRaw.includes('/')) {
                const parts = tanggalRaw.split('/');
                if (parts[0].length === 2) {
                    tanggal = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD/MM/YYYY -> YYYY-MM-DD
                }
            }

            // 4. Update attendance_data table
            const kehadiran = parseFloat(kehadiranStr);

            await connection.execute(
                `INSERT INTO attendance_data (id, user_id, branch_id, tanggal, kehadiran) 
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE kehadiran = VALUES(kehadiran)`,
                [uuidv4(), userId, branchId, tanggal, kehadiran]
            );

            // 5. Trigger recalculation
            await commissionsService.recalculateCommissionsForDateInternal(connection, branchId, tanggal);
            results.success++;
        }

        await auditService.recordLog({
            userId: adminUserId,
            action: 'BULK_ATTENDANCE_IMPORT',
            entity: 'omzet',
            details: { success: results.success, total: results.total }
        });

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
