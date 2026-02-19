import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/change-password', authMiddleware, authController.changePassword);
router.get('/users', authMiddleware, roleMiddleware('admin'), authController.getAll);
router.post('/users', authMiddleware, roleMiddleware('admin'), authController.create);
router.put('/users/:id', authMiddleware, roleMiddleware('admin'), authController.update);
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), authController.remove);

export default router;
