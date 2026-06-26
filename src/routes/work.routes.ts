import { Router } from 'express';
import { getWorks, getWorkById, createWork, updateWork, deleteWork } from '../controllers/work.controller';
import { getChaptersByWorkId } from '../controllers/chapter.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getWorks);
router.get('/:id', getWorkById);
router.get('/:workId/chapters', getChaptersByWorkId); // Sub-recurso: capítulos de la obra
router.post('/', verifyToken, createWork); // Ruta protegida
router.put('/:id', verifyToken, updateWork); // Ruta protegida
router.delete('/:id', verifyToken, deleteWork); // Ruta protegida

export default router;
