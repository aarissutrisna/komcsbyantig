import * as targetService from '../services/targetService.js';

export const getMonthlyTarget = async (req, res) => {
    try {
        const { branchId, month, year } = req.query;
        if (!branchId || !month || !year) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const target = await targetService.getMonthlyTarget(branchId, parseInt(month), parseInt(year));
        res.json(target);
    } catch (error) {
        console.error('Error fetching monthly target:', error);
        res.status(500).json({ error: error.message });
    }
};

export const saveMonthlyTarget = async (req, res) => {
    try {
        // Role check: Admin Only
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update monthly targets' });
        }

        const { branchId, month, year, min_omzet, max_omzet } = req.body;
        if (!branchId || !month || !year || min_omzet === undefined || max_omzet === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await targetService.saveMonthlyTarget(req.user.id, {
            branchId,
            month: parseInt(month),
            year: parseInt(year),
            min_omzet: parseFloat(min_omzet),
            max_omzet: parseFloat(max_omzet)
        });

        res.json({ success: true, message: 'Monthly target saved and commissions recalculated' });
    } catch (error) {
        console.error('Error saving monthly target:', error);
        res.status(500).json({ error: error.message });
    }
};
