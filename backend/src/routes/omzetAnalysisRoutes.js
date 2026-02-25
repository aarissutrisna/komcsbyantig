import express from 'express';
import * as omzetAnalysisController from '../controllers/omzetAnalysisController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('admin'));

router.get('/trends', omzetAnalysisController.getTrends);
router.post('/simulate', omzetAnalysisController.simulate);
router.post('/rebuild', omzetAnalysisController.rebuild);
router.post('/import-legacy', omzetAnalysisController.importLegacy);

export default router;
