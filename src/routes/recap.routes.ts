import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { getRecap } from '../controllers/recap.controller';

const router = Router();

router.post('/:chapterId', verifyToken, getRecap);

export default router;
