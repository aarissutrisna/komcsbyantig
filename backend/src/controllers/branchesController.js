import * as branchesService from '../services/branchesService.js';

export const getAll = async (req, res) => {
    try {
        const branches = await branchesService.getAllBranches();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const create = async (req, res) => {
    try {
        const branch = await branchesService.createBranch(req.body);
        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const update = async (req, res) => {
    try {
        const branch = await branchesService.updateBranch(req.params.id, req.body);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const remove = async (req, res) => {
    try {
        await branchesService.deleteBranch(req.params.id);
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
