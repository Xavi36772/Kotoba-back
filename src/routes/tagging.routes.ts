import { Router } from 'express';
import { predictTagsHandler } from '../controllers/tagging.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/predict-tags', verifyToken, predictTagsHandler);

export default router;
