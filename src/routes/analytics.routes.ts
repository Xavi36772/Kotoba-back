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
  getStoryOverview,
  getStoryVoteTrend,
  getStoryDemographics,
  getStoryChapters,
  getStoryPeaks,
  getStoryReReads,
  getAuthorOverview,
  getAuthorFollowerGrowth,
  getAuthorFollowerDemographics,
  getAuthorWorksPerformance,
  getAuthorRecentActivity,
  getHeatmap,
  getSentimentAnalysis,
  getDemographicCross,
  getReaderPreferences,
  getRetentionCurve,
} from '../controllers/analytics.controller';

const router = Router();

// ── Tracking endpoints (authenticated) ────────────────────────
router.post('/session/start', verifyToken, startSession);
router.post('/session/end', verifyToken, endSession);
router.post('/chapter-read', verifyToken, chapterRead);

// ── Story analytics (per-work) ────────────────────────────────
router.get('/story/:workId/overview', getStoryOverview);
router.get('/story/:workId/vote-trend', getStoryVoteTrend);
router.get('/story/:workId/demographics', getStoryDemographics);
router.get('/story/:workId/chapters', getStoryChapters);
router.get('/story/:workId/peaks', getStoryPeaks);
router.get('/story/:workId/re-reads', getStoryReReads);
router.get('/story/:workId/heatmap', getHeatmap);
router.get('/story/:workId/sentiment', getSentimentAnalysis);
router.get('/story/:workId/demographics-cross', getDemographicCross);
router.get('/story/:workId/reader-preferences', getReaderPreferences);
router.get('/story/:workId/retention', getRetentionCurve);

// ── Author analytics (per-author) ─────────────────────────────
router.get('/author/:authorId/overview', getOverview);
router.get('/author/:authorId/chapters', getChapterAnalytics);
router.get('/author/:authorId/sessions', getSessionAnalytics);
router.get('/author/:authorId/engagement', getEngagement);
router.get('/author/:authorId/genres', getGenreAnalytics);

// ── Author dashboard (enhanced) ───────────────────────────────
router.get('/dashboard/:authorId/overview', getAuthorOverview);
router.get('/dashboard/:authorId/follower-growth', getAuthorFollowerGrowth);
router.get('/dashboard/:authorId/follower-demographics', getAuthorFollowerDemographics);
router.get('/dashboard/:authorId/works-performance', getAuthorWorksPerformance);
router.get('/dashboard/:authorId/recent-activity', getAuthorRecentActivity);

export default router;
