import express from 'express';
import * as branchesController from '../controllers/branchesController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, branchesController.getAll);
router.get('/:id', authMiddleware, branchesController.getById);

export default router;
