import { supabaseAdmin } from '../config/supabase';

export class StoryAnalyticsModel {
  static async getOverview(workId: string) {
    const { data: work, error: wErr } = await supabaseAdmin
      .from('works')
      .select('id, title, view_count, created_at, updated_at, genres')
      .eq('id', workId)
      .single();

    if (wErr || !work) throw new Error('Work not found');

    const [votesResult, followersResult, chaptersResult, readsResult, sessionsResult] = await Promise.all([
      supabaseAdmin.from('work_votes').select('vote').eq('work_id', workId),
      supabaseAdmin.from('work_followers').select('user_id').eq('work_id', workId),
      supabaseAdmin.from('chapters').select('id').eq('work_id', workId),
      supabaseAdmin.from('chapter_reads').select('user_id, read_progress, time_spent_seconds').eq('work_id', workId),
      supabaseAdmin.from('reading_sessions').select('duration_seconds').eq('work_id', workId),
    ]);

    const votes = (votesResult.data || []) as any[];
    const upvotes = votes.filter(v => v.vote === 1).length;
    const downvotes = votes.filter(v => v.vote === -1).length;
    const rating = votes.length > 0
      ? Math.round((upvotes / votes.length) * 100)
      : 0;

    const reads = (readsResult.data || []) as any[];
    const sessions = (sessionsResult.data || []) as any[];
    const uniqueReaders = new Set(reads.map(r => r.user_id)).size;
    const avgProgress = reads.length > 0
      ? reads.reduce((sum, r) => sum + (r.read_progress || 0), 0) / reads.length
      : 0;
    const completionRate = reads.length > 0
      ? reads.filter(r => r.read_progress >= 0.9).length / reads.length
      : 0;
    const avgTimeSpent = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length)
      : 0;

    return {
      workId: work.id,
      title: work.title,
      genres: work.genres,
      totalViews: work.view_count || 0,
      upvotes,
      downvotes,
      rating,
      totalFollowers: (followersResult.data || []).length,
      totalChapters: (chaptersResult.data || []).length,
      uniqueReaders,
      avgProgress: Math.round(avgProgress * 100) / 100,
      completionRate: Math.round(completionRate * 100),
      avgTimeSpent,
      createdAt: work.created_at,
    };
  }

  static async getVoteTrend(workId: string, days = 30) {
    const { data, error } = await supabaseAdmin.rpc('get_vote_trend', {
      work_uuid: workId,
      days,
    });
    if (error) {
      const { data: fallback } = await supabaseAdmin
        .from('work_votes')
        .select('vote, created_at')
        .eq('work_id', workId)
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
        .order('created_at');
      if (!fallback) return [];
      const grouped: Record<string, { upvotes: number; downvotes: number }> = {};
      (fallback as any[]).forEach(v => {
        const date = v.created_at?.slice(0, 10) || '';
        if (!grouped[date]) grouped[date] = { upvotes: 0, downvotes: 0 };
        if (v.vote === 1) grouped[date].upvotes++;
        else grouped[date].downvotes++;
      });
      return Object.entries(grouped).map(([date, vals]) => ({ date, ...vals }));
    }
    return data || [];
  }

  static async getReaderDemographics(workId: string) {
    const { data, error } = await supabaseAdmin.rpc('get_work_reader_demographics', {
      work_uuid: workId,
    });
    if (error) {
      const { data: sessions } = await supabaseAdmin
        .from('reading_sessions')
        .select('user_country, user_age')
        .eq('work_id', workId);
      if (!sessions) return { countries: [], ageRanges: [] };
      return this._computeDemographics(sessions as any[]);
    }
    const raw = data || [];
    const countryMap: Record<string, number> = {};
    const ageMap: Record<string, number> = {};
    (raw as any[]).forEach((r: any) => {
      countryMap[r.country] = (countryMap[r.country] || 0) + Number(r.count);
      ageMap[r.age_range] = (ageMap[r.age_range] || 0) + Number(r.count);
    });
    return {
      countries: Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count),
      ageRanges: Object.entries(ageMap).map(([range, count]) => ({ range, count })).sort((a, b) => b.count - a.count),
    };
  }

  static _computeDemographics(sessions: any[]) {
    const countryMap: Record<string, number> = {};
    const ageMap: Record<string, number> = {};
    sessions.forEach(s => {
      const country = s.user_country || 'Desconocido';
      countryMap[country] = (countryMap[country] || 0) + 1;
      const age = s.user_age;
      let range = 'No especificado';
      if (age != null) {
        if (age < 18) range = 'Menor de 18';
        else if (age <= 24) range = '18-24';
        else if (age <= 34) range = '25-34';
        else if (age <= 44) range = '35-44';
        else if (age <= 54) range = '45-54';
        else range = '55+';
      }
      ageMap[range] = (ageMap[range] || 0) + 1;
    });
    return {
      countries: Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count),
      ageRanges: Object.entries(ageMap).map(([range, count]) => ({ range, count })).sort((a, b) => b.count - a.count),
    };
  }

  static async getChapterAnalytics(workId: string) {
    const { data: chapters, error: chErr } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number')
      .eq('work_id', workId)
      .order('order_number', { ascending: true });

    if (chErr || !chapters || chapters.length === 0) return [];

    const chapterIds = chapters.map(c => c.id);
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, read_progress, time_spent_seconds')
      .in('chapter_id', chapterIds);

    const { data: sessions } = await supabaseAdmin
      .from('reading_sessions')
      .select('chapter_id, duration_seconds')
      .in('chapter_id', chapterIds);

    const readsByChapter: Record<string, any[]> = {};
    const sessionsByChapter: Record<string, any[]> = {};
    (reads || []).forEach(r => {
      if (!readsByChapter[r.chapter_id]) readsByChapter[r.chapter_id] = [];
      readsByChapter[r.chapter_id].push(r);
    });
    (sessions || []).forEach(s => {
      if (!sessionsByChapter[s.chapter_id]) sessionsByChapter[s.chapter_id] = [];
      sessionsByChapter[s.chapter_id].push(s);
    });

    const firstChapterReads = chapters.length > 0
      ? (readsByChapter[chapters[0].id] || []).length
      : 1;

    return chapters.map(ch => {
      const chReads = readsByChapter[ch.id] || [];
      const chSessions = sessionsByChapter[ch.id] || [];
      const totalReads = chReads.length;
      const avgProgress = totalReads > 0
        ? chReads.reduce((sum, r) => sum + r.read_progress, 0) / totalReads
        : 0;
      const avgTimeSpent = chSessions.length > 0
        ? Math.round(chSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / chSessions.length)
        : 0;
      const completionRate = totalReads > 0
        ? chReads.filter(r => r.read_progress >= 0.9).length / totalReads
        : 0;
      const dropOffRate = firstChapterReads > 0
        ? 1 - (totalReads / firstChapterReads)
        : 0;

      return {
        chapterId: ch.id,
        title: ch.title,
        orderNumber: ch.order_number,
        views: totalReads,
        avgProgress: Math.round(avgProgress * 100) / 100,
        avgTimeSpent,
        completionRate: Math.round(completionRate * 100) / 100,
        dropOffRate: Math.round(Math.max(0, dropOffRate) * 100) / 100,
      };
    });
  }

  static async getReadingPeaks(workId: string) {
    const { data: sessions } = await supabaseAdmin
      .from('reading_sessions')
      .select('started_at, chapter_id, chapters!inner(title, order_number)')
      .eq('work_id', workId);

    if (!sessions || sessions.length === 0) return { hourlyPeaks: [], dailyPeaks: [], chapterPeaks: [] };

    const hourly: Record<number, number> = {};
    const daily: Record<number, number> = {};
    const chapterReads: Record<string, { title: string; orderNumber: number; count: number }> = {};

    for (let i = 0; i < 24; i++) hourly[i] = 0;
    for (let i = 0; i < 7; i++) daily[i] = 0;

    (sessions as any[]).forEach(s => {
      const date = new Date(s.started_at);
      hourly[date.getHours()] = (hourly[date.getHours()] || 0) + 1;
      daily[date.getDay()] = (daily[date.getDay()] || 0) + 1;

      const chId = s.chapter_id;
      if (!chapterReads[chId]) {
        chapterReads[chId] = {
          title: (s.chapters as any)?.title || '',
          orderNumber: (s.chapters as any)?.order_number || 0,
          count: 0,
        };
      }
      chapterReads[chId].count++;
    });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return {
      hourlyPeaks: Object.entries(hourly).map(([h, c]) => ({ hour: Number(h), count: c })),
      dailyPeaks: Object.entries(daily).map(([d, c]) => ({ day: dayNames[Number(d)], count: c })),
      chapterPeaks: Object.values(chapterReads).sort((a, b) => b.count - a.count),
    };
  }

  static async getReReadPatterns(workId: string) {
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, user_id, chapters!inner(title, order_number)')
      .eq('work_id', workId);

    if (!reads) return [];

    const userReads: Record<string, Record<string, number>> = {};
    (reads as any[]).forEach(r => {
      if (!userReads[r.user_id]) userReads[r.user_id] = {};
      userReads[r.user_id][r.chapter_id] = (userReads[r.user_id][r.chapter_id] || 0) + 1;
    });

    const reReadMap: Record<string, { title: string; orderNumber: number; reReadCount: number }> = {};
    Object.values(userReads).forEach(chapterReads => {
      Object.entries(chapterReads).forEach(([chId, count]) => {
        if (count > 1) {
          if (!reReadMap[chId]) {
            const ch = (reads as any[]).find(r => r.chapter_id === chId);
            reReadMap[chId] = {
              title: ch?.chapters?.title || '',
              orderNumber: ch?.chapters?.order_number || 0,
              reReadCount: 0,
            };
          }
          reReadMap[chId].reReadCount += count - 1;
        }
      });
    });

    return Object.values(reReadMap).sort((a, b) => b.reReadCount - a.reReadCount).slice(0, 10);
  }
}
