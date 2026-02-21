import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getSetting = async (key, defaultValue = null) => {
    const [rows] = await pool.execute(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        [key]
    );
    if (rows.length === 0) return defaultValue;

    try {
        return JSON.parse(rows[0].setting_value);
    } catch {
        return rows[0].setting_value;
    }
};

export const updateSetting = async (key, value) => {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    await pool.execute(
        `INSERT INTO system_settings (id, setting_key, setting_value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), key, stringValue, stringValue]
    );
    return { success: true };
};

export const getImportStatus = async () => {
    const status = await getSetting('initial_import_status', {
        done: false,
        at: null,
        start: null,
        end: null,
        count: 0
    });
    return status;
};

export const setImportStatus = async (details) => {
    await updateSetting('initial_import_status', {
        done: true,
        at: new Date().toISOString(),
        ...details
    });
};
