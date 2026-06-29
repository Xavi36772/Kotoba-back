import { Router } from 'express';
import { createComment, deleteComment, getcoments } from '../controllers/comment.controller';

const router = Router();

router.get('/',getcoments)
router.post('/', createComment);
router.delete('/:id', deleteComment);

export default router;
