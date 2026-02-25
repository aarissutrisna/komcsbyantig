import * as omzetAnalysisService from '../services/omzetAnalysisService.js';

export const getTrends = async (req, res) => {
    try {
        const { branchId } = req.query;
        if (!branchId) return res.status(400).json({ error: 'branchId is required' });
        const data = await omzetAnalysisService.getHistoricalTrends(branchId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const simulate = async (req, res) => {
    try {
        const { branchId, year, month, minTarget, maxTarget } = req.body;
        const result = await omzetAnalysisService.simulateTargets(
            branchId, year, month, minTarget, maxTarget
        );
        if (!result) return res.status(404).json({ error: 'No data found for the selected period' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const rebuild = async (req, res) => {
    try {
        const { year, month, branchId } = req.body;
        const result = await omzetAnalysisService.rebuildAggregation(year, month, branchId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const importLegacy = async (req, res) => {
    try {
        const { data } = req.body; // Array of { branch_id, date, total }
        if (!Array.isArray(data)) return res.status(400).json({ error: 'Data must be an array' });
        const result = await omzetAnalysisService.importLegacyOmzet(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
