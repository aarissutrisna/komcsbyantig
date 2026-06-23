import express from 'express';
import * as financeController from '../controllers/financeController.js';
import * as financeSimulationController from '../controllers/financeSimulationController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All finance routes require authentication and admin/owner role
router.use(authMiddleware);
router.use(roleMiddleware('super_admin', 'admin', 'owner'));

// Finance Groups
router.get('/groups', financeController.getGroups);
router.get('/groups/:groupKey', financeController.getGroupDetail);
router.put('/groups/:groupKey/settings', financeController.updateGroupSettings);

// Analysis Runs
router.post('/analysis-runs/:groupKey/preview', financeController.previewAnalysis);
router.post('/analysis-runs/:groupKey/save', financeController.saveAnalysis);
router.get('/analysis-runs/:groupKey', financeController.getAnalysisHistory);
router.get('/analysis-runs/:groupKey/:runId', financeController.getAnalysisDetail);
router.delete('/analysis-runs/:groupKey/:runId', financeController.deleteAnalysisRun);

// Simulations
router.post('/simulations/:groupKey/preview', financeSimulationController.previewSimulation);
router.post('/simulations/:groupKey/save', financeSimulationController.saveSimulation);
router.get('/simulations/:groupKey', financeSimulationController.getSimulations);
router.get('/simulations/:groupKey/:simId', financeSimulationController.getSimulationDetail);
router.delete('/simulations/:groupKey/:simId', financeSimulationController.deleteSimulation);

// Alerts
router.get('/alerts/:groupKey', financeController.getAlerts);
router.put('/alerts/:alertId/read', financeController.markAlertRead);

export default router;
