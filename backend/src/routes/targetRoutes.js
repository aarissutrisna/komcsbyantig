import express from 'express';
import * as targetController from '../controllers/targetController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', targetController.getMonthlyTarget);
router.post('/save', targetController.saveMonthlyTarget);

export default router;
