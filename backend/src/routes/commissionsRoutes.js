import express from 'express';
import * as commissionsController from '../controllers/commissionsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/scope.js';

const router = express.Router();

router.post('/calculate-by-date', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, commissionsController.calculateByDate);
router.post('/calculate-by-branch', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, commissionsController.calculateByBranch);
router.post('/recalculate-all', authMiddleware, roleMiddleware('admin'), commissionsController.recalculateAll);

export default router;
