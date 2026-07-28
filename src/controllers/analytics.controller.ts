import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReadingSessionModel } from '../models/reading_session.model';
import { ChapterReadModel } from '../models/chapter_read.model';
import { WorkModel } from '../models/work.model';
import { StoryAnalyticsModel } from '../models/story_analytics.model';
import { AuthorDashboardModel } from '../models/author_dashboard.model';
import { supabaseAdmin } from '../config/supabase';

// ── Tracking Endpoints ──────────────────────────────────────────

export const startSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { work_id, chapter_id, device_type, platform } = req.body;
    if (!work_id || !chapter_id) {
      res.status(400).json({ error: 'work_id and chapter_id are required' });
      return;
    }
    const session = await ReadingSessionModel.create({
      user_id: req.user!.id,
      work_id,
      chapter_id,
      device_type,
      platform,
    });
    res.status(201).json({ session_id: session.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const endSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { session_id, duration_seconds } = req.body;
    if (!session_id) {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }
    await ReadingSessionModel.endSession(session_id, duration_seconds || 0);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const chapterRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { work_id, chapter_id, read_progress, time_spent_seconds } = req.body;
    if (!work_id || !chapter_id) {
      res.status(400).json({ error: 'work_id and chapter_id are required' });
      return;
    }
    const read = await ChapterReadModel.create({
      user_id: req.user!.id,
      work_id,
      chapter_id,
      read_progress: read_progress || 0,
      time_spent_seconds: time_spent_seconds || 0,
    });
    res.status(201).json(read);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ── Story Analytics Endpoints ───────────────────────────────────

export const getStoryOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const data = await StoryAnalyticsModel.getOverview(workId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getStoryVoteTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const days = parseInt(req.query.days as string) || 30;
    const data = await StoryAnalyticsModel.getVoteTrend(workId, days);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getStoryDemographics = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const data = await StoryAnalyticsModel.getReaderDemographics(workId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getStoryChapters = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const data = await StoryAnalyticsModel.getChapterAnalytics(workId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getStoryPeaks = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const data = await StoryAnalyticsModel.getReadingPeaks(workId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getStoryReReads = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const data = await StoryAnalyticsModel.getReReadPatterns(workId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ── Author Dashboard Endpoints ──────────────────────────────────

export const getAuthorOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const data = await AuthorDashboardModel.getOverview(authorId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthorFollowerGrowth = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const days = parseInt(req.query.days as string) || 30;
    const data = await AuthorDashboardModel.getFollowerGrowth(authorId, days);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthorFollowerDemographics = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const data = await AuthorDashboardModel.getFollowerDemographics(authorId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthorWorksPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const data = await AuthorDashboardModel.getWorksPerformance(authorId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthorRecentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await AuthorDashboardModel.getRecentActivity(authorId, limit);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ── Legacy Author Stats (backwards compatible) ──────────────────

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const works = await WorkModel.findAll({ author_id: authorId });
    const workIds = works.map((w: any) => w.id);

    if (workIds.length === 0) {
      res.json({
        totalReads: 0,
        activeReaders: 0,
        avgSessionDuration: 0,
        totalChaptersRead: 0,
        completionRate: 0,
        totalFollowers: 0,
      });
      return;
    }

    const [readsResult, sessionsResult, followersResult] = await Promise.all([
      supabaseAdmin.from('chapter_reads').select('user_id, read_progress').in('work_id', workIds),
      supabaseAdmin.from('reading_sessions').select('duration_seconds, user_id').in('work_id', workIds).gt('duration_seconds', 0),
      supabaseAdmin.from('work_followers').select('user_id', { count: 'exact', head: false }).in('work_id', workIds),
    ]);

    const reads = (readsResult.data || []) as any[];
    const sessions = (sessionsResult.data || []) as any[];
    const followers = followersResult.count || 0;

    const activeReaders = new Set(reads.map((r: any) => r.user_id)).size;
    const totalReads = reads.length;
    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.reduce((sum: number, s: any) => sum + s.duration_seconds, 0) / sessions.length)
      : 0;
    const totalChaptersRead = reads.length;
    const completedReads = reads.filter((r: any) => r.read_progress >= 0.9).length;
    const completionRate = totalReads > 0 ? Math.round((completedReads / totalReads) * 100) : 0;

    let authorFollowers = 0;
    try {
      const { count } = await supabaseAdmin
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', authorId);
      authorFollowers = count || 0;
    } catch (_) {}

    res.json({
      totalReads,
      activeReaders,
      avgSessionDuration,
      totalChaptersRead,
      completionRate,
      totalFollowers: authorFollowers,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getChapterAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const chapters = await ChapterReadModel.getChaptersByAuthor(authorId);
    res.json(chapters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSessionAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const [hourly, daily, devices, avgDuration] = await Promise.all([
      ReadingSessionModel.getHourlyDistribution(authorId),
      ReadingSessionModel.getDailyDistribution(authorId),
      ReadingSessionModel.getDeviceBreakdown(authorId),
      ReadingSessionModel.getAvgSessionDuration(authorId),
    ]);
    res.json({ hourlyDistribution: hourly, dailyDistribution: daily, deviceBreakdown: devices, avgDuration });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getEngagement = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const [reReadPatterns, dropOffPoints] = await Promise.all([
      ChapterReadModel.getReReadPatterns(authorId),
      ChapterReadModel.getDropOffPoints(authorId),
    ]);
    res.json({ reReadPatterns, dropOffPoints });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getGenreAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const works = await WorkModel.findAll({ author_id: authorId });

    const genreStats: Record<string, { reads: number; works: number }> = {};
    for (const work of works as any[]) {
      const genres = work.genres || [];
      const { count } = await supabaseAdmin
        .from('chapter_reads')
        .select('id', { count: 'exact', head: true })
        .eq('work_id', work.id);

      for (const genre of genres) {
        if (!genreStats[genre]) genreStats[genre] = { reads: 0, works: 0 };
        genreStats[genre].reads += count || 0;
        genreStats[genre].works += 1;
      }
    }

    const result = Object.entries(genreStats)
      .map(([genre, stats]) => ({ genre, ...stats }))
      .sort((a, b) => b.reads - a.reads);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
