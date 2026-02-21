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
