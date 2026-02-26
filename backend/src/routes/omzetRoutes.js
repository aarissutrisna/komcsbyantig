import express from 'express';
import * as omzetController from '../controllers/omzetController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/scope.js';

const router = express.Router();

router.post('/create', authMiddleware, roleMiddleware('admin', 'hrd', 'cs'), branchScopeMiddleware, omzetController.create);
router.get('/by-date', authMiddleware, branchScopeMiddleware, omzetController.getByDate);
router.get('/by-branch', authMiddleware, branchScopeMiddleware, omzetController.getByBranch);
router.get('/by-user', authMiddleware, branchScopeMiddleware, omzetController.getByUser);
router.get('/user-assignment-check', authMiddleware, branchScopeMiddleware, omzetController.getUserAssignmentCheck);
router.get('/stats', authMiddleware, branchScopeMiddleware, omzetController.getStats);

// New Refactored N8N Integration Endpoints
router.get('/preview-today', authMiddleware, branchScopeMiddleware, omzetController.previewToday);
router.get('/update-comparison', authMiddleware, branchScopeMiddleware, omzetController.showUpdateComparison);
router.post('/update-controlled', authMiddleware, branchScopeMiddleware, omzetController.saveControlledUpdate);
router.post('/update-kehadiran', authMiddleware, branchScopeMiddleware, omzetController.updateKehadiran);
router.post('/sync-today', authMiddleware, branchScopeMiddleware, omzetController.syncToday);
router.post('/import-historical', authMiddleware, roleMiddleware('admin'), omzetController.importHistorical);
router.post('/import-attendance', authMiddleware, roleMiddleware('admin'), omzetController.importAttendance);

router.post('/webhook/n8n', omzetController.receiveN8NWebhook);

export default router;
