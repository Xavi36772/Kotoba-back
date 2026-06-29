import { Router } from 'express';
import { getMyBookmarks, bookmarkWork, unbookmarkWork, checkBookmark } from '../controllers/bookmark.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/mine', verifyToken, getMyBookmarks);
router.get('/:workId', verifyToken, checkBookmark);
router.post('/:workId', verifyToken, bookmarkWork);
router.delete('/:workId', verifyToken, unbookmarkWork);

export default router;
