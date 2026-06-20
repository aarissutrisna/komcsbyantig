import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/import-status', authMiddleware, roleMiddleware('admin'), settingsController.getImportStatus);
router.get('/scheduler', authMiddleware, roleMiddleware('admin'), settingsController.getSchedulerConfig);
router.post('/scheduler', authMiddleware, roleMiddleware('admin'), settingsController.updateSchedulerConfig);

// Webhook Transfer Bonus URL — baca: semua user, ubah: admin only
router.get('/webhook-transfer-bonus', authMiddleware, settingsController.getWebhookTransferBonus);
router.post('/webhook-transfer-bonus', authMiddleware, roleMiddleware('admin'), settingsController.updateWebhookTransferBonus);

// Bonus Transfer Settings (pembagi & pengali) — baca: semua user, ubah: admin only
router.get('/bonus-transfer', authMiddleware, settingsController.getBonusTransferSettings);
router.post('/bonus-transfer', authMiddleware, roleMiddleware('admin'), settingsController.updateBonusTransferSettings);

export default router;

