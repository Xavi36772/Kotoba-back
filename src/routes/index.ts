import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workRoutes from './work.routes';
import chapterRoutes from './chapter.routes';
import commentRoutes from './comment.routes';
import uploadRoutes from './upload.routes';
import bookmarkRoutes from './bookmark.routes';
import searchRoutes from './search.routes';
import notificationRoutes from './notification.routes';
import recapRoutes from './recap.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/works', workRoutes);
router.use('/chapters', chapterRoutes);
router.use('/comments', commentRoutes);
router.use('/upload', uploadRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/recap', recapRoutes);

export default router;

