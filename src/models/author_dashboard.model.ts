import { supabaseAdmin } from '../config/supabase';

export class AuthorDashboardModel {
  static async getOverview(authorId: string) {
    const { data: works } = await supabaseAdmin
      .from('works')
      .select('id, view_count')
      .eq('author_id', authorId);

    const workIds = (works || []).map((w: any) => w.id);
    const publishedWorks = (works || []).filter((w: any) => w.status !== 'draft').length;

    const [followersResult, totalViews] = await Promise.all([
      workIds.length > 0
        ? supabaseAdmin.from('work_followers').select('user_id', { count: 'exact', head: false }).in('work_id', workIds)
        : { count: 0, data: [] },
      Promise.resolve((works || []).reduce((sum: number, w: any) => sum + (w.view_count || 0), 0)),
    ]);

    let authorFollowers = 0;
    try {
      const { count } = await supabaseAdmin
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', authorId);
      authorFollowers = count || 0;
    } catch (_) {}

    return {
      publishedWorks,
      totalViews,
      totalFollowers: authorFollowers,
      workCount: (works || []).length,
    };
  }

  static async getFollowerGrowth(authorId: string, days = 30) {
    const { data, error } = await supabaseAdmin.rpc('get_follower_growth', {
      author_id: authorId,
      days,
    });
    if (error) {
      const { data: followers } = await supabaseAdmin
        .from('followers')
        .select('created_at')
        .eq('following_id', authorId)
        .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
        .order('created_at');
      if (!followers) return [];
      const grouped: Record<string, number> = {};
      (followers as any[]).forEach(f => {
        const date = f.created_at?.slice(0, 10) || '';
        grouped[date] = (grouped[date] || 0) + 1;
      });
      return Object.entries(grouped).map(([date, count]) => ({ date, count }));
    }
    return data || [];
  }

  static async getFollowerDemographics(authorId: string) {
    const [countryData, ageData] = await Promise.all([
      supabaseAdmin.rpc('get_follower_country_dist', { author_id: authorId }),
      supabaseAdmin.rpc('get_follower_age_dist', { author_id: authorId }),
    ]);

    let countries = (countryData.data || []).map((r: any) => ({ country: r.country, count: Number(r.count) }));
    let ageRanges = (ageData.data || []).map((r: any) => ({ range: r.age_range, count: Number(r.count) }));

    if (countryData.error) {
      const { data: followers } = await supabaseAdmin
        .from('followers')
        .select('follower_id')
        .eq('following_id', authorId);
      if (followers && followers.length > 0) {
        const fIds = followers.map((f: any) => f.follower_id);
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('age, country')
          .in('id', fIds);
        const countryMap: Record<string, number> = {};
        const ageMap: Record<string, number> = {};
        (users || []).forEach((u: any) => {
          const c = u.country || 'Desconocido';
          countryMap[c] = (countryMap[c] || 0) + 1;
          let range = 'No especificado';
          if (u.age != null) {
            if (u.age < 18) range = 'Menor de 18';
            else if (u.age <= 24) range = '18-24';
            else if (u.age <= 34) range = '25-34';
            else if (u.age <= 44) range = '35-44';
            else if (u.age <= 54) range = '45-54';
            else range = '55+';
          }
          ageMap[range] = (ageMap[range] || 0) + 1;
        });
        countries = Object.entries(countryMap).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
        ageRanges = Object.entries(ageMap).map(([range, count]) => ({ range, count })).sort((a, b) => b.count - a.count);
      }
    }

    return { countries, ageRanges };
  }

  static async getWorksPerformance(authorId: string) {
    const { data: works } = await supabaseAdmin
      .from('works')
      .select('id, title, view_count, created_at, genres, status')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    if (!works || works.length === 0) return [];

    const workIds = works.map(w => w.id);

    const [votesData, readsData, followersData] = await Promise.all([
      supabaseAdmin.from('work_votes').select('work_id, vote').in('work_id', workIds),
      supabaseAdmin.from('chapter_reads').select('work_id, user_id, read_progress').in('work_id', workIds),
      supabaseAdmin.from('work_followers').select('work_id').in('work_id', workIds),
    ]);

    const votesByWork: Record<string, any[]> = {};
    const readsByWork: Record<string, any[]> = {};
    const followersByWork: Record<string, number> = {};

    (votesData.data || []).forEach((v: any) => {
      if (!votesByWork[v.work_id]) votesByWork[v.work_id] = [];
      votesByWork[v.work_id].push(v);
    });
    (readsData.data || []).forEach((r: any) => {
      if (!readsByWork[r.work_id]) readsByWork[r.work_id] = [];
      readsByWork[r.work_id].push(r);
    });
    (followersData.data || []).forEach((f: any) => {
      followersByWork[f.work_id] = (followersByWork[f.work_id] || 0) + 1;
    });

    return works.map(w => {
      const votes = votesByWork[w.id] || [];
      const reads = readsByWork[w.id] || [];
      const upvotes = votes.filter((v: any) => v.vote === 1).length;
      const downvotes = votes.filter((v: any) => v.vote === -1).length;
      const uniqueReaders = new Set(reads.map((r: any) => r.user_id)).size;
      const completionRate = reads.length > 0
        ? Math.round((reads.filter((r: any) => r.read_progress >= 0.9).length / reads.length) * 100)
        : 0;

      return {
        workId: w.id,
        title: w.title,
        genres: w.genres,
        status: w.status,
        views: w.view_count || 0,
        upvotes,
        downvotes,
        rating: votes.length > 0 ? Math.round((upvotes / votes.length) * 100) : 0,
        uniqueReaders,
        completionRate,
        followers: followersByWork[w.id] || 0,
        createdAt: w.created_at,
      };
    });
  }

  static async getRecentActivity(authorId: string, limit = 20) {
    const { data: works } = await supabaseAdmin
      .from('works')
      .select('id, title')
      .eq('author_id', authorId);

    if (!works || works.length === 0) return [];

    const workIds = works.map(w => w.id);
    const workTitleMap: Record<string, string> = {};
    works.forEach(w => { workTitleMap[w.id] = w.title; });

    const [votesResult, followersResult, commentsResult] = await Promise.all([
      supabaseAdmin.from('work_votes').select('work_id, user_id, vote, created_at, users!work_votes_user_id_fkey(username)').in('work_id', workIds).order('created_at', { ascending: false }).limit(limit),
      supabaseAdmin.from('followers').select('following_id, follower_id, created_at, users!followers_follower_id_fkey(username)').in('following_id', [authorId]).order('created_at', { ascending: false }).limit(limit),
      supabaseAdmin.from('comments').select('work_id, user_id, content, created_at, users!comments_user_id_fkey(username)').in('work_id', workIds).order('created_at', { ascending: false }).limit(limit),
    ]);

    const activities: any[] = [];

    (votesResult.data || []).forEach((v: any) => {
      activities.push({
        type: 'vote',
        workId: v.work_id,
        workTitle: workTitleMap[v.work_id] || '',
        username: (v.users as any)?.username || 'Anónimo',
        detail: v.vote === 1 ? 'upvote' : 'downvote',
        createdAt: v.created_at,
      });
    });

    (followersResult.data || []).forEach((f: any) => {
      activities.push({
        type: 'follower',
        username: (f.users as any)?.username || 'Anónimo',
        createdAt: f.created_at,
      });
    });

    (commentsResult.data || []).forEach((c: any) => {
      activities.push({
        type: 'comment',
        workId: c.work_id,
        workTitle: workTitleMap[c.work_id] || '',
        username: (c.users as any)?.username || 'Anónimo',
        detail: c.content?.slice(0, 100) || '',
        createdAt: c.created_at,
      });
    });

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return activities.slice(0, limit);
  }
}
