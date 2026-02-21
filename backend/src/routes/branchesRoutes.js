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

export default router;
