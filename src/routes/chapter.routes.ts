import { Router } from 'express';
import { getChapterById, createChapter, updateChapter, deleteChapter, getChapter } from '../controllers/chapter.controller';
import { getCommentsByChapterId, createChapterComment, getChapterCommentsWithLikes, replyToComment } from '../controllers/comment.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getChapter);
router.get('/:id', getChapterById);
router.get('/:chapterId/comments', getCommentsByChapterId);
router.get('/:chapterId/comments/with-likes', verifyToken, getChapterCommentsWithLikes);
router.post('/:chapterId/comments', verifyToken, createChapterComment);
router.post('/comments/:id/replies', verifyToken, replyToComment);
router.post('/', verifyToken, createChapter);
router.put('/:id', verifyToken, updateChapter);
router.delete('/:id', verifyToken, deleteChapter);

export default router;
