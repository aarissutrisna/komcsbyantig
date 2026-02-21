import express from 'express';
import * as withdrawalsController from '../controllers/withdrawalsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/scope.js';

const router = express.Router();

// CS creates a withdrawal request
router.post('/create', authMiddleware, branchScopeMiddleware, withdrawalsController.create);

// Admin/HRD approves or rejects a pending request
router.post('/approve', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, withdrawalsController.approve);

// Get list of withdrawal requests (all roles, scoped)
router.get('/list', authMiddleware, branchScopeMiddleware, withdrawalsController.getAll);

// Get personal balance
router.get('/balance', authMiddleware, branchScopeMiddleware, withdrawalsController.getBalance);

// Get full mutation history / ledger (all roles, scoped)
router.get('/mutations', authMiddleware, branchScopeMiddleware, withdrawalsController.getMutations);

// Get daily aggregation summary (Admin/HRD only)
router.get('/daily-summary', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, withdrawalsController.getDailySummary);

// Manual mutation CRUD (Admin/HRD only)
router.post('/manual', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, withdrawalsController.createManual);
router.put('/manual/:id', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, withdrawalsController.updateManual);
router.delete('/manual/:id', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, withdrawalsController.deleteManual);

export default router;
