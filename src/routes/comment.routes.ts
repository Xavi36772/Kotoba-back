import { Router } from 'express';
import { createComment, deleteComment } from '../controllers/comment.controller';

const router = Router();

router.post('/', createComment);
router.delete('/:id', deleteComment);

export default router;
