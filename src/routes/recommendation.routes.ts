import { Router } from 'express';
import { getRecommended } from '../controllers/recommendation.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, getRecommended);

export default router;
