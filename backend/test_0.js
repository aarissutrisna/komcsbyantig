import pool from './src/config/database.js';
import * as omzetService from './src/services/omzetService.js';

async function test() {
    try {
        // 1. find a user and record
        const [users] = await pool.execute('SELECT id FROM users WHERE role = "cs" LIMIT 1');
        if (!users.length) { console.log('No CS users'); return; }
        const userId = users[0].id;

        // find omzet
        const [omzet] = await pool.execute('SELECT id FROM omzet LIMIT 1');
        if (!omzet.length) { console.log('No omzet'); return; }
        const recordId = omzet[0].id;

        console.log('Testing updateKehadiran with 0', { userId, recordId });
        await omzetService.updateKehadiran(userId, recordId, 0);

        console.log('Update success! Checking attendance_data table...');
        const [att] = await pool.execute('SELECT * FROM attendance_data WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1', [userId]);
        console.log(att);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

test();
