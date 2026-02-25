import * as penugasanService from '../services/penugasanService.js';

/**
 * POST /api/penugasan
 * Create a new CS assignment.
 */
export const createPenugasan = async (req, res) => {
    try {
        const { userId, cabangId, tanggalMulai, faktorKomisi } = req.body;

        if (!userId || !cabangId || !tanggalMulai || faktorKomisi === undefined || faktorKomisi === null || faktorKomisi === '') {
            return res.status(400).json({ error: 'userId, cabangId, tanggalMulai, dan faktorKomisi wajib diisi' });
        }

        const result = await penugasanService.createPenugasan({
            userId,
            cabangId,
            tanggalMulai,
            faktorKomisi,
            createdBy: req.user?.id || null,
        });

        return res.status(201).json(result);
    } catch (err) {
        const status = err.message.includes('melebihi') || err.message.includes('wajib') || err.message.includes('hanya') || err.message.includes('tidak boleh') ? 400 : 500;
        return res.status(status).json({ error: err.message });
    }
};

/**
 * GET /api/penugasan
 * Get all penugasan records.
 */
export const getPenugasan = async (req, res) => {
    try {
        const data = await penugasanService.getAllPenugasan();
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/penugasan/:id
 * Remove a penugasan record.
 */
export const removePenugasan = async (req, res) => {
    try {
        await penugasanService.deletePenugasan(req.params.id);
        return res.json({ message: 'Penugasan berhasil dihapus' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
/**
 * GET /api/penugasan/my-branches
 * Get all branches the logged-in CS user has ever been assigned to.
 * Used by Dashboard and DataAttendance for branch dropdown.
 */
export const getMyBranches = async (req, res) => {
    try {
        const data = await penugasanService.getMyBranches(req.user.id);
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/penugasan/rekap
 * Get current active assignment per user per branch (admin only).
 */
export const getRekapTerakhir = async (req, res) => {
    try {
        const data = await penugasanService.getRekapPenugasanTerakhir();
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/penugasan/histori?cabangId=xxx
 * Get chronological assignment history for a branch (admin only).
 */
export const getHistoriPenugasan = async (req, res) => {
    try {
        const { cabangId } = req.query;
        if (!cabangId) return res.status(400).json({ error: 'cabangId wajib diisi' });
        const data = await penugasanService.getHistoriPenugasanByCabang(cabangId);
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
