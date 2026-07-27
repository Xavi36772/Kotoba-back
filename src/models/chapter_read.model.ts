import { supabaseAdmin } from '../config/supabase';

export class ChapterReadModel {
  static async create(data: {
    user_id: string;
    work_id: string;
    chapter_id: string;
    read_progress: number;
    time_spent_seconds: number;
  }) {
    const { data: read, error } = await supabaseAdmin
      .from('chapter_reads')
      .insert({
        user_id: data.user_id,
        work_id: data.work_id,
        chapter_id: data.chapter_id,
        read_progress: data.read_progress,
        time_spent_seconds: data.time_spent_seconds,
      })
      .select()
      .single();

    if (error) throw error;
    return read;
  }

  static async getByChapter(chapterId: string) {
    const { data, error } = await supabaseAdmin
      .from('chapter_reads')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getChaptersByAuthor(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data: chapters, error: chError } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number, work_id')
      .in('work_id', workIds)
      .order('order_number', { ascending: true });

    if (chError || !chapters) return [];

    const chapterIds = chapters.map((c: any) => c.id);
    if (chapterIds.length === 0) return [];

    const { data: reads, error: rError } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, read_progress, time_spent_seconds')
      .in('chapter_id', chapterIds);

    if (rError) return [];

    const readsByChapter: Record<string, any[]> = {};
    (reads || []).forEach((r: any) => {
      if (!readsByChapter[r.chapter_id]) readsByChapter[r.chapter_id] = [];
      readsByChapter[r.chapter_id].push(r);
    });

    return chapters.map((ch: any) => {
      const chReads = readsByChapter[ch.id] || [];
      const totalReads = chReads.length;
      const avgProgress = totalReads > 0
        ? chReads.reduce((sum: number, r: any) => sum + r.read_progress, 0) / totalReads
        : 0;
      const avgTimeSpent = totalReads > 0
        ? Math.round(chReads.reduce((sum: number, r: any) => sum + r.time_spent_seconds, 0) / totalReads)
        : 0;
      const completionRate = totalReads > 0
        ? chReads.filter((r: any) => r.read_progress >= 0.9).length / totalReads
        : 0;

      return {
        chapterId: ch.id,
        title: ch.title,
        orderNumber: ch.order_number,
        views: totalReads,
        avgProgress: Math.round(avgProgress * 100) / 100,
        avgTimeSpent,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    });
  }

  static async getReReadPatterns(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, user_id, chapters!inner(title, order_number)')
      .in('work_id', workIds);

    if (error || !data) return [];

    const userReads: Record<string, Record<string, number>> = {};
    data.forEach((r: any) => {
      if (!userReads[r.user_id]) userReads[r.user_id] = {};
      userReads[r.user_id][r.chapter_id] = (userReads[r.user_id][r.chapter_id] || 0) + 1;
    });

    const reReadCounts: Record<string, { title: string; orderNumber: number; reReadCount: number }> = {};
    Object.values(userReads).forEach(chapterReads => {
      Object.entries(chapterReads).forEach(([chId, count]) => {
        if (count > 1) {
          if (!reReadCounts[chId]) {
            const ch = data.find((r: any) => r.chapter_id === chId);
            reReadCounts[chId] = {
              title: (ch as any)?.chapters?.title || '',
              orderNumber: (ch as any)?.chapters?.order_number || 0,
              reReadCount: 0,
            };
          }
          reReadCounts[chId].reReadCount += count - 1;
        }
      });
    });

    return Object.values(reReadCounts)
      .sort((a, b) => b.reReadCount - a.reReadCount)
      .slice(0, 10);
  }

  static async getDropOffPoints(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data: chapters, error: chError } = await supabaseAdmin
      .from('chapters')
      .select('id, title, order_number, work_id')
      .in('work_id', workIds)
      .order('order_number', { ascending: true });

    if (chError || !chapters) return [];

    const chapterIds = chapters.map((c: any) => c.id);
    if (chapterIds.length === 0) return [];

    const { data: reads } = await supabaseAdmin
      .from('chapter_reads')
      .select('chapter_id, read_progress')
      .in('chapter_id', chapterIds);

    const completionByChapter: Record<string, number> = {};
    chapterIds.forEach(id => { completionByChapter[id] = 0; });
    (reads || []).forEach((r: any) => {
      if (r.read_progress >= 0.9) {
        completionByChapter[r.chapter_id] = (completionByChapter[r.chapter_id] || 0) + 1;
      }
    });

    const totalReadsByChapter: Record<string, number> = {};
    (reads || []).forEach((r: any) => {
      totalReadsByChapter[r.chapter_id] = (totalReadsByChapter[r.chapter_id] || 0) + 1;
    });

    const firstChapter = chapters[0];
    const firstReads = totalReadsByChapter[firstChapter?.id] || 1;

    return chapters.map((ch: any) => {
      const total = totalReadsByChapter[ch.id] || 0;
      const completed = completionByChapter[ch.id] || 0;
      const dropOffRate = firstReads > 0 ? 1 - (total / firstReads) : 0;
      return {
        title: ch.title,
        orderNumber: ch.order_number,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
        completionRate: total > 0 ? Math.round((completed / total) * 100) / 100 : 0,
        totalReads: total,
      };
    });
  }
}
