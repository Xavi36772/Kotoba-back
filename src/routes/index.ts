import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workRoutes from './work.routes';
import chapterRoutes from './chapter.routes';
import commentRoutes from './comment.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/works', workRoutes);
router.use('/chapters', chapterRoutes);
router.use('/comments', commentRoutes);
router.use('/upload', uploadRoutes);

export default router;

