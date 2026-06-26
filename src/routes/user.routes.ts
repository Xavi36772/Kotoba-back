import { Router } from 'express';
import { getUsers, getUserById, getMe, getAuthorStats } from '../controllers/user.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getUsers);
router.get('/me', verifyToken, getMe);
router.get('/:id', getUserById);
router.get('/:authorId/stats', getAuthorStats);

export default router;
