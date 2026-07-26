import { supabase, supabaseAdmin } from '../config/supabase';

export const WORK_SELECT = `
  *,
  users!works_author_id_fkey(username),
  chapters:chapters(count)
`;

function mapWork(w: any) {
  return {
    ...w,
    author_name: w.users?.username || '',
    chapter_count: w.chapters?.[0]?.count ?? 0,
    users: undefined,
    chapters: undefined,
  };
}

async function attachVoteStats(works: any[]) {
  if (works.length === 0) return works;
  const ids = works.map((w: any) => w.id);
  const { data: voteData } = await supabaseAdmin
    .from('work_votes')
    .select('work_id, vote')
    .in('work_id', ids);

  const statsMap: Record<string, { total: number; count: number }> = {};
  for (const v of (voteData || []) as any[]) {
    if (!statsMap[v.work_id]) statsMap[v.work_id] = { total: 0, count: 0 };
    statsMap[v.work_id].total += v.vote;
    statsMap[v.work_id].count += 1;
  }

  return works.map((w: any) => {
    const stats = statsMap[w.id];
    const count = stats?.count || 0;
    const total = stats?.total || 0;
    return {
      ...w,
      rating: count > 0 ? Math.max(0, total / count) : 0,
      rating_count: count,
    };
  });
}

export class WorkModel {
  static async findAll(filters?: Record<string, string>) {
    let query = supabase
      .from('works')
      .select(WORK_SELECT);
    if (filters?.author_id) {
      query = query.eq('author_id', filters.author_id);
    } else {
      query = query.neq('status', 'draft');
    }
    if (filters?.genre && filters.genre !== 'Todos') {
      query = query.contains('genres', [filters.genre]);
    }
    const { data, error } = await query;
    if (error) throw error;
    const mapped = (data || []).map(mapWork);
    return attachVoteStats(mapped);
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('works')
      .select(WORK_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    const mapped = mapWork(data);
    const results = await attachVoteStats([mapped]);
    return results[0];
  }

  static async create(workData: any) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .insert([workData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, workData: any) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .update(workData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async countByAuthor(authorId: string) {
    const { count, error } = await supabase
      .from('works')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId);

    if (error) throw error;
    return count || 0;
  }

  static async findByAuthor(authorId: string) {
    const { data, error } = await supabase
      .from('works')
      .select(WORK_SELECT)
      .eq('author_id', authorId);

    if (error) throw error;
    const mapped = (data || []).map(mapWork);
    return attachVoteStats(mapped);
  }

  static async incrementViewCount(workId: string, userId: string) {
    const { data: existing } = await supabaseAdmin
      .from('work_views')
      .select('*')
      .eq('user_id', userId)
      .eq('work_id', workId)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabaseAdmin
      .from('work_views')
      .insert({ user_id: userId, work_id: workId });
    if (insertError) throw insertError;

    // Try the RPC first; if it doesn't exist, fall back to manual count
    const { error: rpcError } = await supabaseAdmin
      .rpc('increment_view_count', { row_id: workId });
    if (rpcError) {
      const { count, error: countError } = await supabaseAdmin
        .from('work_views')
        .select('*', { count: 'exact', head: true })
        .eq('work_id', workId);
      if (countError) throw countError;
      await supabaseAdmin
        .from('works')
        .update({ view_count: count || 0 })
        .eq('id', workId);
    }
  }
}
