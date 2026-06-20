import express from 'express';
import * as bonusClaimsController from '../controllers/bonusClaimsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, bonusClaimsController.getClaims);
router.get('/claimed-ids', authMiddleware, bonusClaimsController.getClaimedIds);
router.get('/:id', authMiddleware, bonusClaimsController.getClaimDetail);
router.post('/', authMiddleware, bonusClaimsController.createClaim);
router.delete('/:id', authMiddleware, bonusClaimsController.deleteClaim);

export default router;
