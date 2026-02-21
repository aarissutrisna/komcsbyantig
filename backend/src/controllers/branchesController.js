import * as branchesService from '../services/branchesService.js';
import * as auditService from '../services/auditService.js';

export const getAll = async (req, res) => {
    try {
        const branches = await branchesService.getAllBranches();

        // SCOPE ENFORCEMENT
        if (req.branchScope) {
            return res.json(branches.filter(b => b.id === req.branchScope));
        }

        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getById = async (req, res) => {
    try {
        const id = req.params.id;

        // SCOPE ENFORCEMENT
        if (req.branchScope && req.branchScope !== id) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this branch' });
        }

        const branch = await branchesService.getBranchById(id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const create = async (req, res) => {
    try {
        const branch = await branchesService.createBranch(req.body);

        await auditService.recordLog({
            userId: req.user.id,
            action: 'CREATE_BRANCH',
            entity: 'branch',
            entityId: branch.id,
            ipAddress: req.ip,
            details: { name: branch.name }
        });

        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const update = async (req, res) => {
    try {
        const branch = await branchesService.updateBranch(req.params.id, req.body);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        await auditService.recordLog({
            userId: req.user.id,
            action: 'UPDATE_BRANCH',
            entity: 'branch',
            entityId: branch.id,
            ipAddress: req.ip,
            details: { name: branch.name, changes: req.body }
        });

        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const remove = async (req, res) => {
    try {
        await branchesService.deleteBranch(req.params.id);

        await auditService.recordLog({
            userId: req.user.id,
            action: 'DELETE_BRANCH',
            entity: 'branch',
            entityId: req.params.id,
            ipAddress: req.ip
        });

        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
