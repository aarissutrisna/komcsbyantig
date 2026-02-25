import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createPenugasan, getPenugasan, removePenugasan, getMyBranches, getRekapTerakhir, getHistoriPenugasan } from '../controllers/penugasanController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/penugasan – List all assignments (admin only)
router.get('/', roleMiddleware('admin'), getPenugasan);

// GET /api/penugasan/rekap – Active assignment recap per branch (admin only)
router.get('/rekap', roleMiddleware('admin'), getRekapTerakhir);

// GET /api/penugasan/histori?cabangId=xxx – Chronological assignment history (admin only)
router.get('/histori', roleMiddleware('admin'), getHistoriPenugasan);

// GET /api/penugasan/my-branches – List branches this user has been assigned to (any role)
router.get('/my-branches', getMyBranches);

// POST /api/penugasan – Create a new assignment (admin only)
router.post('/', roleMiddleware('admin'), createPenugasan);

// DELETE /api/penugasan/:id – Remove an assignment (admin only)
router.delete('/:id', roleMiddleware('admin'), removePenugasan);

export default router;
