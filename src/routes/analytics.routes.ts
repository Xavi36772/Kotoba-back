import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import {
  startSession,
  endSession,
  chapterRead,
  getOverview,
  getChapterAnalytics,
  getSessionAnalytics,
  getEngagement,
  getGenreAnalytics,
} from '../controllers/analytics.controller';

const router = Router();

// Tracking endpoints (authenticated)
router.post('/session/start', verifyToken, startSession);
router.post('/session/end', verifyToken, endSession);
router.post('/chapter-read', verifyToken, chapterRead);

// Analytics endpoints (public, by author ID)
router.get('/author/:authorId/overview', getOverview);
router.get('/author/:authorId/chapters', getChapterAnalytics);
router.get('/author/:authorId/sessions', getSessionAnalytics);
router.get('/author/:authorId/engagement', getEngagement);
router.get('/author/:authorId/genres', getGenreAnalytics);

export default router;
