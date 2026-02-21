import express from 'express';
import * as maintenanceController from '../controllers/maintenanceController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Endpoint stable 210226.
 * Restricted to admin to prevent accidental / malicious reroll by unauthorized users.
 */
router.post('/210226', authMiddleware, roleMiddleware('admin'), maintenanceController.reroll210226);

// Alias for easy calling if they just want "/reroll"
router.post('/reroll', authMiddleware, roleMiddleware('admin'), maintenanceController.reroll210226);

export default router;
