import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import * as mutasiController from '../controllers/mutasiController.js';

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// Admin: full control
router.get('/history', roleMiddleware('admin'), mutasiController.getAllHistory);
router.get('/history/:userId', mutasiController.getHistory);         // Admin or self
router.post('/', roleMiddleware('admin'), mutasiController.createMutation);
router.get('/affected-dates', roleMiddleware('admin'), mutasiController.getAffectedDates);
router.get('/allocations/:branchId', roleMiddleware('admin'), mutasiController.getAllocations);
router.put('/allocations/:id', roleMiddleware('admin'), mutasiController.updateAllocation);

export default router;
