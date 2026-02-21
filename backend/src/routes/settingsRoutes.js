import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/import-status', authMiddleware, roleMiddleware('admin'), settingsController.getImportStatus);
router.get('/scheduler', authMiddleware, roleMiddleware('admin'), settingsController.getSchedulerConfig);
router.post('/scheduler', authMiddleware, roleMiddleware('admin'), settingsController.updateSchedulerConfig);

export default router;
