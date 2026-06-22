import express from 'express';
import * as branchesController from '../controllers/branchesController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/scope.js';

const router = express.Router();

router.get('/', authMiddleware, branchScopeMiddleware, branchesController.getAll);
router.get('/:id', authMiddleware, branchScopeMiddleware, branchesController.getById);
router.post('/', authMiddleware, roleMiddleware('admin'), branchesController.create);
router.put('/:id', authMiddleware, roleMiddleware('admin'), branchesController.update);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), branchesController.remove);

// Debt Webhook Management
router.put('/:id/debt-webhook', authMiddleware, roleMiddleware('admin'), branchesController.updateDebtWebhook);
router.get('/:id/debt-webhook', authMiddleware, branchesController.getDebtWebhook);
router.post('/:id/debt-webhook/test', authMiddleware, roleMiddleware('admin'), branchesController.testDebtWebhook);
router.get('/:id/debt-webhook/siblings', authMiddleware, branchesController.getDebtWebhookSiblings);

export default router;
