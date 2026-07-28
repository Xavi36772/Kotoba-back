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

  static async getHeatmap(workId: string) {
    const { data: chapters } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number')
      .eq('work_id', workId)
      .order('order_number', { ascending: true });

    if (!chapters || chapters.length === 0) return [];

    const chapterIds = chapters.map(c => c.id);
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, user_id, read_progress, time_spent_seconds')
      .in('chapter_id', chapterIds);

    const firstChapterReads = (reads || []).filter(r => r.chapter_id === chapters[0].id).length || 1;

    return chapters.map(ch => {
      const chReads = (reads || []).filter(r => r.chapter_id === ch.id);
      const totalReaders = new Set(chReads.map(r => r.user_id)).size;
      const segments = [
        { range: '0-25%', min: 0, max: 0.25 },
        { range: '25-50%', min: 0.25, max: 0.5 },
        { range: '50-75%', min: 0.5, max: 0.75 },
        { range: '75-100%', min: 0.75, max: 1.01 },
      ].map(seg => {
        const readersAtSegment = chReads.filter(r => r.read_progress >= seg.min && r.read_progress < seg.max).length;
        return {
          range: seg.range,
          readersAtSegment,
          dropOffPercent: firstChapterReads > 0 ? Math.round(((firstChapterReads - readersAtSegment) / firstChapterReads) * 100) : 0,
        };
      });
      const avgProgress = totalReaders > 0 ? chReads.reduce((sum, r) => sum + (r.read_progress || 0), 0) / chReads.length : 0;
      const avgTimeSeconds = chReads.length > 0 ? Math.round(chReads.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / chReads.length) : 0;

      return {
        chapterId: ch.id,
        title: ch.title,
        orderNumber: ch.order_number,
        totalReaders,
        segments,
        avgProgress: Math.round(avgProgress * 100) / 100,
        avgTimeSeconds,
      };
    });
  }

  static async getSentimentAnalysis(workId: string) {
    const { data: chapters } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number')
      .eq('work_id', workId)
      .order('order_number', { ascending: true });

    if (!chapters || chapters.length === 0) return [];

    const chapterIds = chapters.map(c => c.id);
    const { data: comments } = await supabaseAdmin
      .from('comments')
      .select('chapter_id, content')
      .in('chapter_id', chapterIds);

    const positiveWords = ['increíble', 'increible', 'genial', 'amazing', 'love', 'hermoso', 'perfecto', 'bonito', 'excelente', 'encanta', 'brillante', 'fantástico', 'fantastico', 'wow', 'gusta', 'encantó', 'emocionante', 'padre', 'chido', 'bueno', 'mejor', 'top', 'wena', 'cool', 'nice'];
    const negativeWords = ['malo', 'aburrido', 'terrible', 'horrible', 'hate', 'odio', 'feo', 'boring', 'dropeo', 'dropped', 'decepcionante', 'meh', 'pésimo', 'pesimo', 'asqueroso', 'basura', 'asco', 'lamentable', 'malo'];

    return chapters.map(ch => {
      const chComments = (comments || []).filter(c => c.chapter_id === ch.id);
      let positiveCount = 0;
      let negativeCount = 0;
      chComments.forEach(c => {
        const text = (c.content || '').toLowerCase();
        const isPositive = positiveWords.some(w => text.includes(w));
        const isNegative = negativeWords.some(w => text.includes(w));
        if (isPositive) positiveCount++;
        if (isNegative) negativeCount++;
      });
      const total = chComments.length;
      const neutralCount = total - positiveCount - negativeCount;
      const sentimentScore = total > 0 ? Math.round(((positiveCount - negativeCount) / total) * 100) / 100 : 0;

      return {
        chapterId: ch.id,
        title: ch.title,
        orderNumber: ch.order_number,
        totalComments: total,
        positiveCount,
        negativeCount,
        neutralCount: Math.max(0, neutralCount),
        sentimentScore,
      };
    });
  }

  static async getDemographicCrossAnalysis(workId: string) {
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('user_id, read_progress')
      .eq('work_id', workId);

    if (!reads || reads.length === 0) return { ageGroups: [], countries: [] };

    const userIds = [...new Set((reads as any[]).map(r => r.user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, age, country')
      .in('id', userIds);

    const userMap: Record<string, any> = {};
    (users || []).forEach(u => { userMap[u.id] = u; });

    const ageGroups: Record<string, { readers: Set<string>, progress: number[], completed: number }> = {};
    const countryGroups: Record<string, { readers: Set<string>, progress: number[], completed: number }> = {};

    (reads as any[]).forEach(r => {
      const user = userMap[r.user_id];
      if (!user) return;
      const age = user.age;
      let range = 'No especificado';
      if (age != null) {
        if (age < 18) range = 'Menor de 18';
        else if (age <= 24) range = '18-24';
        else if (age <= 34) range = '25-34';
        else if (age <= 44) range = '35-44';
        else if (age <= 54) range = '45-54';
        else range = '55+';
      }
      if (!ageGroups[range]) ageGroups[range] = { readers: new Set(), progress: [], completed: 0 };
      ageGroups[range].readers.add(r.user_id);
      ageGroups[range].progress.push(r.read_progress || 0);
      if ((r.read_progress || 0) >= 0.9) ageGroups[range].completed++;

      const country = user.country || 'Desconocido';
      if (!countryGroups[country]) countryGroups[country] = { readers: new Set(), progress: [], completed: 0 };
      countryGroups[country].readers.add(r.user_id);
      countryGroups[country].progress.push(r.read_progress || 0);
      if ((r.read_progress || 0) >= 0.9) countryGroups[country].completed++;
    });

    const computeMetrics = (data: { readers: Set<string>, progress: number[], completed: number }) => ({
      readerCount: data.readers.size,
      avgProgress: data.progress.length > 0 ? Math.round((data.progress.reduce((a, b) => a + b, 0) / data.progress.length) * 100) / 100 : 0,
      completionRate: data.readers.size > 0 ? Math.round((data.completed / data.readers.size) * 100) : 0,
    });

    return {
      ageGroups: Object.entries(ageGroups)
        .map(([ageRange, data]) => ({ ageRange, ...computeMetrics(data) }))
        .sort((a, b) => b.readerCount - a.readerCount),
      countries: Object.entries(countryGroups)
        .map(([country, data]) => ({ country, ...computeMetrics(data) }))
        .sort((a, b) => b.readerCount - a.readerCount)
        .slice(0, 10),
    };
  }

  static async getReaderPreferences(workId: string) {
    const { data: work } = await supabaseAdmin
      .from('works')
      .select('genres')
      .eq('id', workId)
      .single();

    if (!work) return { expectedReadersPercent: 0, unexpectedReadersPercent: 0, genreAffinity: [] };

    const workGenres = work.genres || [];
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('user_id')
      .eq('work_id', workId);

    if (!reads || reads.length === 0) return { expectedReadersPercent: 0, unexpectedReadersPercent: 0, genreAffinity: [] };

    const readerIds = [...new Set((reads as any[]).map(r => r.user_id))];
    const { data: otherReads } = await supabaseAdmin
      .from('chapter_reads')
      .select('user_id, work_id')
      .in('user_id', readerIds)
      .neq('work_id', workId);

    const otherWorkIds = [...new Set((otherReads || []).map((r: any) => r.work_id))];
    let otherWorks: any[] = [];
    if (otherWorkIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('works')
        .select('id, genres')
        .in('id', otherWorkIds);
      otherWorks = data || [];
    }

    const otherWorkGenreMap: Record<string, string[]> = {};
    (otherWorks as any[]).forEach(w => { otherWorkGenreMap[w.id] = w.genres || []; });

    const readerGenreCounts: Record<string, Record<string, number>> = {};
    (otherReads || []).forEach((r: any) => {
      if (!readerGenreCounts[r.user_id]) readerGenreCounts[r.user_id] = {};
      const genres = otherWorkGenreMap[r.work_id] || [];
      genres.forEach((g: string) => {
        readerGenreCounts[r.user_id][g] = (readerGenreCounts[r.user_id][g] || 0) + 1;
      });
    });

    let expected = 0;
    let unexpected = 0;
    const genreReaderCount: Record<string, Set<string>> = {};

    readerIds.forEach(uid => {
      const readerGenres = Object.keys(readerGenreCounts[uid] || {});
      const hasOverlap = readerGenres.some(g => workGenres.includes(g));
      if (hasOverlap) expected++;
      else unexpected++;

      workGenres.forEach((g: string) => {
        if (!genreReaderCount[g]) genreReaderCount[g] = new Set();
        genreReaderCount[g].add(uid);
      });
    });

    const total = readerIds.length || 1;
    return {
      expectedReadersPercent: Math.round((expected / total) * 100),
      unexpectedReadersPercent: Math.round((unexpected / total) * 100),
      genreAffinity: workGenres.map((genre: string) => ({
        genre,
        readerCount: (genreReaderCount[genre] || new Set()).size,
      })),
    };
  }

  static async getRetentionCurve(workId: string) {
    const { data: chapters } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number')
      .eq('work_id', workId)
      .order('order_number', { ascending: true });

    if (!chapters || chapters.length < 2) return [];

    const chapterIds = chapters.map(c => c.id);
    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, user_id')
      .in('chapter_id', chapterIds);

    const readersByChapter: Record<string, Set<string>> = {};
    (reads || []).forEach(r => {
      if (!readersByChapter[r.chapter_id]) readersByChapter[r.chapter_id] = new Set();
      readersByChapter[r.chapter_id].add(r.user_id);
    });

    return chapters.slice(0, -1).map((ch, idx) => {
      const nextCh = chapters[idx + 1];
      const readersAt = readersByChapter[ch.id]?.size || 0;
      const readersAtNext = readersByChapter[nextCh.id]?.size || 0;
      const retained = readersAt > 0
        ? [...(readersByChapter[ch.id] || [])].filter(uid => (readersByChapter[nextCh.id] || new Set()).has(uid)).length
        : 0;

      return {
        chapterOrder: ch.order_number,
        chapterTitle: ch.title,
        readersAtChapter: readersAt,
        retainedToNext: retained,
        retentionRate: readersAt > 0 ? Math.round((retained / readersAt) * 100) : 0,
        nextChapterTitle: nextCh.title,
      };
    });
  }
}
