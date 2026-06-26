import { Router } from 'express';
import { getChapterById, createChapter, updateChapter, deleteChapter, getChapter } from '../controllers/chapter.controller';
import { getCommentsByChapterId } from '../controllers/comment.controller';

const router = Router();

router.get('/', getChapter);
router.get('/:id', getChapterById);
router.get('/:chapterId/comments', getCommentsByChapterId); // Sub-recurso: comentarios del capítulo
router.post('/', createChapter);
router.put('/:id', updateChapter);
router.delete('/:id', deleteChapter);

export default router;
