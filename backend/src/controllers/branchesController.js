import * as branchesService from '../services/branchesService.js';
import * as auditService from '../services/auditService.js';
import * as financeGroupService from '../services/financeGroupService.js';
import * as financeDebtService from '../services/financeDebtService.js';
import pool from '../config/database.js';

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

// ─── Debt Webhook Management ──────────────────────────────────────────────────

/**
 * Update debt webhook configuration for a branch
 * Auto-syncs secret to all branches with the same endpoint
 */
export const updateDebtWebhook = async (req, res) => {
    try {
        const { id } = req.params;
        const { n8n_debt_endpoint, n8n_debt_secret } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Update this branch
            await connection.execute(
                `UPDATE branches SET n8n_debt_endpoint = ?, n8n_debt_secret = ? WHERE id = ?`,
                [n8n_debt_endpoint || null, n8n_debt_secret || null, id]
            );

            // 2. Auto-sync secret to all branches with the same endpoint
            let syncedBranches = [];
            if (n8n_debt_endpoint) {
                const [siblings] = await connection.execute(
                    `SELECT id FROM branches WHERE n8n_debt_endpoint = ? AND id != ?`,
                    [n8n_debt_endpoint, id]
                );

                if (siblings.length > 0) {
                    await connection.execute(
                        `UPDATE branches SET n8n_debt_secret = ? WHERE n8n_debt_endpoint = ? AND id != ?`,
                        [n8n_debt_secret || null, n8n_debt_endpoint, id]
                    );
                    syncedBranches = siblings.map(s => s.id);
                }

                // 3. Create/update finance_group_settings entry
                const financeGroupKey = financeGroupService.generateGroupKey(n8n_debt_endpoint);
                await connection.execute(
                    `INSERT INTO finance_group_settings (finance_group_key, webhook_url, webhook_secret)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE webhook_url = VALUES(webhook_url), webhook_secret = VALUES(webhook_secret)`,
                    [financeGroupKey, n8n_debt_endpoint, n8n_debt_secret || null]
                );
            }

            await connection.commit();

            // Get updated branch info
            const [updatedBranch] = await pool.execute(
                `SELECT id, name, n8n_debt_endpoint, finance_group_key FROM branches WHERE id = ?`,
                [id]
            );

            let financeGroupName = null;
            if (updatedBranch[0]?.finance_group_key) {
                const group = await financeGroupService.getGroupByKey(updatedBranch[0].finance_group_key);
                financeGroupName = group?.group_name;
            }

            await auditService.recordLog({
                userId: req.user.id,
                action: 'UPDATE_DEBT_WEBHOOK',
                entity: 'branch',
                entityId: id,
                ipAddress: req.ip,
                details: { n8n_debt_endpoint, synced_branches: syncedBranches }
            });

            res.json({
                success: true,
                branch: updatedBranch[0],
                synced_branches: syncedBranches,
                finance_group_key: updatedBranch[0]?.finance_group_key,
                finance_group_name: financeGroupName,
                message: syncedBranches.length > 0
                    ? `Webhook updated. Secret auto-synced to: ${syncedBranches.join(', ')}`
                    : 'Webhook updated successfully'
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get debt webhook configuration for a branch
 */
export const getDebtWebhook = async (req, res) => {
    try {
        const { id } = req.params;

        // First, get basic branch info
        const [branchRows] = await pool.execute(
            `SELECT 
                id, name, n8n_debt_endpoint, n8n_debt_secret, finance_group_key
            FROM branches
            WHERE id = ?`,
            [id]
        );

        if (!branchRows[0]) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        const branch = branchRows[0];
        let financeGroup = null;
        let siblings = [];
        let settings = null;

        // Try to get finance group settings (may not exist yet)
        try {
            const [settingsRows] = await pool.execute(
                `SELECT opex_percent, safety_margin_percent, n_days_default
                FROM finance_group_settings
                WHERE finance_group_key = ?`,
                [branch.finance_group_key]
            );
            settings = settingsRows[0] || null;
        } catch (err) {
            // Table might not exist yet, that's OK
            console.log('finance_group_settings table not available yet');
        }

        if (branch.finance_group_key) {
            try {
                financeGroup = await financeGroupService.getGroupByKey(branch.finance_group_key);
                siblings = await financeGroupService.getBranchesInGroup(branch.finance_group_key);
            } catch (err) {
                console.log('Error fetching finance group info:', err.message);
            }
        }

        res.json({
            ...branch,
            finance_group: financeGroup,
            siblings: siblings.filter(s => s.id !== id),
            settings
        });
    } catch (error) {
        console.error('Error getting debt webhook:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Test debt webhook connection
 */
export const testDebtWebhook = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            `SELECT finance_group_key FROM branches WHERE id = ?`,
            [id]
        );

        if (!rows[0] || !rows[0].finance_group_key) {
            return res.status(400).json({ error: 'Branch does not have a debt webhook configured' });
        }

        const result = await financeDebtService.testWebhookConnection(rows[0].finance_group_key);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get sibling branches (same finance group)
 */
export const getDebtWebhookSiblings = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            `SELECT finance_group_key FROM branches WHERE id = ?`,
            [id]
        );

        if (!rows[0] || !rows[0].finance_group_key) {
            return res.json({ siblings: [], finance_group_name: null });
        }

        const siblings = await financeGroupService.getBranchesInGroup(rows[0].finance_group_key);
        const group = await financeGroupService.getGroupByKey(rows[0].finance_group_key);

        res.json({
            siblings: siblings.filter(s => s.id !== id),
            finance_group_name: group?.group_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
