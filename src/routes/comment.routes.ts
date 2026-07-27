import { Router } from 'express';
import {
  createComment,
  deleteComment,
  getcoments,
  getCommentsByWorkId,
  createWorkComment,
  likeComment,
  unlikeComment,
  getCommentLikes,
  getCommentsWithUserLikes,
  replyToComment,
} from '../controllers/comment.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getcoments);
router.post('/', createComment);
router.get('/work/:workId', getCommentsByWorkId);
router.post('/work/:workId', verifyToken, createWorkComment);
router.delete('/:id', deleteComment);

// Reply endpoint
router.post('/:id/replies', verifyToken, replyToComment);

// Like endpoints
router.post('/:id/like', verifyToken, likeComment);
router.delete('/:id/like', verifyToken, unlikeComment);
router.get('/:id/likes', verifyToken, getCommentLikes);
router.get('/work/:workId/with-likes', verifyToken, getCommentsWithUserLikes);

export default router;
