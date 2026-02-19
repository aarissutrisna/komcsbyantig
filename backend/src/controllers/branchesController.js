import * as branchesService from '../services/branchesService.js';

export const getAll = async (req, res) => {
    try {
        const branches = await branchesService.getAllBranches();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getById = async (req, res) => {
    try {
        const branch = await branchesService.getBranchById(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
