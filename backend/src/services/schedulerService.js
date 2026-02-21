import cron from 'node-cron';
import pool from '../config/database.js';
import * as n8nService from './n8nService.js';
import * as settingsService from './settingsService.js';
import * as omzetUpdateService from './omzetUpdateService.js';
import * as auditService from './auditService.js';

let activeCron = null;

/**
 * Initialize Scheduler
 */
export const initScheduler = async () => {
    const settings = await settingsService.getSetting('scheduler_config', {
        enabled: false,
        time: '23:30' // default
    });

    if (settings.enabled) {
        scheduleJob(settings.time);
    }
};

/**
 * Schedule the daily job
 */
export const scheduleJob = (timeStr) => {
    if (activeCron) {
        activeCron.stop();
    }

    const [hour, minute] = timeStr.split(':');
    const cronExpr = `${minute} ${hour} * * *`;

    activeCron = cron.schedule(cronExpr, async () => {
        console.log(`[Scheduler] Starting daily auto-fetch at ${new Date().toISOString()}`);
        await runDailyAutoFetch();
    });

    console.log(`[Scheduler] Scheduled daily job at ${timeStr}`);
};

/**
 * Run fetch for all active branches
 */
export const runDailyAutoFetch = async () => {
    try {
        const [branches] = await pool.execute('SELECT id, name FROM branches WHERE n8n_endpoint IS NOT NULL AND n8n_endpoint != ""');
        const today = new Date().toISOString().split('T')[0];

        for (const branch of branches) {
            try {
                console.log(`[Scheduler] Fetching data for ${branch.name}...`);

                // Use OmzetUpdateService logic but with AUTO source
                const n8nData = await n8nService.fetchFromBranch(branch.id, { startDate: today, endDate: today });
                const item = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === today);

                if (item) {
                    const total = parseFloat(item.cash || 0) + parseFloat(item.piutang || 0);
                    const description = `Cash: ${item.cash}, Piutang: ${item.piutang} (AUTO)`;

                    // Insert with AUTO source and is_final = true
                    await pool.execute(
                        `INSERT INTO omzet (id, user_id, branch_id, cash, bayar_piutang, total, date, description, source, is_final, last_synced_at)
             VALUES (UUID(), 'SYSTEM', ?, ?, ?, ?, ?, 'AUTO', TRUE, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE 
               cash = VALUES(cash), 
               bayar_piutang = VALUES(bayar_piutang), 
               total = VALUES(total),
               description = VALUES(description), 
               source = 'AUTO', 
               is_final = TRUE,
               last_synced_at = CURRENT_TIMESTAMP`,
                        [branch.id, item.cash || 0, item.piutang || 0, total, today, description]
                    );

                    await auditService.recordLog({
                        userId: null,
                        action: 'AUTO_FETCH_DAILY',
                        entity: 'branch',
                        entityId: branch.id,
                        details: { date: today, branch_name: branch.name, amount: total }
                    });
                }
            } catch (err) {
                console.error(`[Scheduler] Failed for branch ${branch.name}:`, err);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Critical error in daily fetch:', err);
    }
};
