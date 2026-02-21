import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { createPenugasan, getPenugasan, removePenugasan, getMyBranches } from '../controllers/penugasanController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/penugasan – List all assignments (admin only)
router.get('/', roleMiddleware('admin'), getPenugasan);

// POST /api/penugasan – Create a new assignment (admin only)
router.post('/', roleMiddleware('admin'), createPenugasan);

// GET /api/penugasan/my-branches – List branches this user has been assigned to (any role)
router.get('/my-branches', getMyBranches);

// DELETE /api/penugasan/:id – Remove an assignment (admin only)
router.delete('/:id', roleMiddleware('admin'), removePenugasan);

export default router;
