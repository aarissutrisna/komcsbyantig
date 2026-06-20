import * as settingsService from '../services/settingsService.js';
import * as schedulerService from '../services/schedulerService.js';

export const getImportStatus = async (req, res) => {
    try {
        const status = await settingsService.getImportStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getSchedulerConfig = async (req, res) => {
    try {
        const config = await settingsService.getSetting('scheduler_config', {
            enabled: false,
            time: '23:30'
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSchedulerConfig = async (req, res) => {
    try {
        const { enabled, time } = req.body;
        await settingsService.updateSetting('scheduler_config', { enabled, time });

        if (enabled) {
            schedulerService.scheduleJob(time);
        } else {
            // Logic to stop if disabled
            schedulerService.scheduleJob('0 0 31 2 *'); // Hack to stop: Feb 31st
        }

        res.json({ success: true, message: 'Scheduler config updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── Webhook Transfer Bonus ───────────────────────────────────────────────────

const DEFAULT_WEBHOOK_URL = 'http://192.168.100.12:5678/webhook/transfer-bonus-v2';

export const getWebhookTransferBonus = async (req, res) => {
    try {
        const url = await settingsService.getSetting('webhook_transfer_bonus_url', DEFAULT_WEBHOOK_URL);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

    export const getBonusTransferSettings = async (req, res) => {
    try {
        const pembagi = await settingsService.getSetting('bonus_transfer_pembagi', 10000000);
        const pengali = await settingsService.getSetting('bonus_transfer_pengali', 5000);
        res.json({ pembagi, pengali });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateBonusTransferSettings = async (req, res) => {
    try {
        const { pembagi, pengali } = req.body;
        if (!pembagi || pembagi <= 0) {
            return res.status(400).json({ error: 'Nilai pembagi harus lebih dari 0' });
        }
        if (!pengali || pengali <= 0) {
            return res.status(400).json({ error: 'Nilai pengali harus lebih dari 0' });
        }
        await settingsService.updateSetting('bonus_transfer_pembagi', Number(pembagi));
        await settingsService.updateSetting('bonus_transfer_pengali', Number(pengali));
        res.json({ success: true, message: 'Pengaturan bonus berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateWebhookTransferBonus = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL tidak valid' });
        }
        await settingsService.updateSetting('webhook_transfer_bonus_url', url.trim());
        res.json({ success: true, message: 'Webhook URL berhasil diperbarui' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
