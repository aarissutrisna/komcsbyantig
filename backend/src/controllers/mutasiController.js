import * as mutasiService from '../services/mutasiService.js';
import * as auditService from '../services/auditService.js';

export const getHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const history = userId
            ? await mutasiService.getUserCabangHistory(userId)
            : await mutasiService.getAllMutasiHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllHistory = async (req, res) => {
    try {
        const history = await mutasiService.getAllMutasiHistory();
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createMutation = async (req, res) => {
    try {
        const { userId, cabangId, startDate, endDate } = req.body;
        if (!userId || !cabangId || !startDate) {
            return res.status(400).json({ error: 'userId, cabangId, dan startDate wajib diisi' });
        }

        const result = await mutasiService.createMutation({
            userId,
            cabangId,
            startDate,
            endDate: endDate || null,
            createdBy: req.user.id
        });

        await auditService.recordLog({
            userId: req.user.id,
            action: 'MUTASI_CABANG',
            entity: 'user',
            entityId: userId,
            ipAddress: req.ip,
            details: { cabangId, startDate, endDate }
        });

        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getAffectedDates = async (req, res) => {
    try {
        const { cabangId, startDate, endDate } = req.query;
        if (!cabangId || !startDate) {
            return res.status(400).json({ error: 'cabangId dan startDate wajib diisi' });
        }
        const dates = await mutasiService.getAffectedDates(cabangId, startDate, endDate);
        res.json({ affected_dates: dates, count: dates.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllocations = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { tanggal } = req.query;
        const date = tanggal || new Date().toISOString().slice(0, 10);
        const allocations = await mutasiService.getAllocationsByBranch(branchId, date);
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAllocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { porsiPercent } = req.body;
        if (porsiPercent === undefined || porsiPercent < 0 || porsiPercent > 100) {
            return res.status(400).json({ error: 'porsiPercent harus antara 0-100' });
        }
        const result = await mutasiService.updateAllocation(id, porsiPercent);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
