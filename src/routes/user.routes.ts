import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getMe,
  updateMe,
  getPublicProfile,
  followUser,
  unfollowUser,
  getAuthorStats,
} from '../controllers/user.controller';
import { verifyToken } from '../middleware/auth.middleware';
import multer from 'multer';
import { uploadAvatar } from '../controllers/upload.controller';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/', getUsers);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);
router.put('/me/avatar', verifyToken, upload.single('image'), uploadAvatar);
router.get('/:id', getUserById);
router.get('/:id/profile', getPublicProfile);
router.post('/:id/follow', verifyToken, followUser);
router.delete('/:id/follow', verifyToken, unfollowUser);
router.get('/:authorId/stats', getAuthorStats);

export default router;
