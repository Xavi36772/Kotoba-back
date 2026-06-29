import { Router } from 'express';
import {
  createComment,
  deleteComment,
  getcoments,
  getCommentsByWorkId,
  createWorkComment,
} from '../controllers/comment.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getcoments);
router.post('/', createComment);
router.get('/work/:workId', getCommentsByWorkId);
router.post('/work/:workId', verifyToken, createWorkComment);
router.delete('/:id', deleteComment);

export default router;
