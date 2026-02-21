import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { branchScopeMiddleware } from '../middleware/scope.js';

const router = express.Router();

router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/change-password', authMiddleware, authController.changePassword);
router.get('/users', authMiddleware, roleMiddleware('admin', 'hrd'), branchScopeMiddleware, authController.getAll);
router.post('/users', authMiddleware, roleMiddleware('admin'), branchScopeMiddleware, authController.create);
router.put('/users/:id', authMiddleware, roleMiddleware('admin'), branchScopeMiddleware, authController.update);
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), branchScopeMiddleware, authController.remove);
router.post('/users/:id/resign', authMiddleware, roleMiddleware('admin'), authController.resign);
router.post('/users/:id/reactivate', authMiddleware, roleMiddleware('admin'), authController.reactivate);

export default router;
