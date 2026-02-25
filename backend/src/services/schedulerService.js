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

    // node-cron 3.0+ supports timezone option
    activeCron = cron.schedule(cronExpr, async () => {
        const jakartaDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        console.log(`[Scheduler] Starting daily auto-fetch for Jakarta Date: ${jakartaDate} at ${new Date().toISOString()}`);
        await runDailyAutoFetch(jakartaDate);
    }, {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    console.log(`[Scheduler] Scheduled daily job at ${timeStr} (Asia/Jakarta)`);
};

/**
 * Run fetch for all active branches
 */
export const runDailyAutoFetch = async (targetDate = null) => {
    try {
        const [branches] = await pool.execute('SELECT id, name FROM branches WHERE n8n_endpoint IS NOT NULL AND n8n_endpoint != ""');

        // If targetDate not provided, default to current Jakarta date
        const dateToFetch = targetDate || new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        for (const branch of branches) {
            try {
                console.log(`[Scheduler] Fetching data for ${branch.name} on date ${dateToFetch}...`);

                // Use OmzetUpdateService logic but with AUTO source
                const n8nData = await n8nService.fetchFromBranch(branch.id, { startDate: dateToFetch, endDate: dateToFetch });
                const item = n8nData.find(d => n8nService.convertDateFormat(d.tanggal) === dateToFetch);

                if (item) {
                    const total = parseFloat(item.cash || 0) + parseFloat(item.piutang || 0);
                    const description = `Cash: ${item.cash}, Piutang: ${item.piutang} (AUTO)`;

                    // Insert with AUTO source and is_final = true
                    await pool.execute(
                        `INSERT INTO omzet (id, user_id, branch_id, cash, bayar_piutang, total, date, description, source, is_final, last_synced_at)
             VALUES (UUID(), NULL, ?, ?, ?, ?, ?, ?, 'AUTO', TRUE, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE 
               cash = VALUES(cash), 
               bayar_piutang = VALUES(bayar_piutang), 
               total = VALUES(total),
               description = VALUES(description), 
               source = 'AUTO', 
               is_final = TRUE,
               last_synced_at = CURRENT_TIMESTAMP`,
                        [branch.id, item.cash || 0, item.piutang || 0, total, dateToFetch, description]
                    );

                    await auditService.recordLog({
                        userId: null,
                        action: 'AUTO_FETCH_DAILY',
                        entity: 'branch',
                        entityId: branch.id,
                        details: { date: dateToFetch, branch_name: branch.name, amount: total }
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
