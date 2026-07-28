import { supabaseAdmin } from '../config/supabase';
import { WORK_SELECT, mapWork } from '../models/work.model';

export async function getRecommendedWorks(userId?: string) {
  const seenIds = new Set<string>();
  const scoreMap = new Map<string, number>();

  if (userId) {
    const { data: bookmarks } = await supabaseAdmin
      .from('bookmarks')
      .select('work_id')
      .eq('user_id', userId);

    const bookmarkedIds = (bookmarks || []).map((b: any) => b.work_id);
    for (const id of bookmarkedIds) seenIds.add(id);

    for (const workId of bookmarkedIds) {
      const { data: seedEmbedding } = await supabaseAdmin
        .from('work_embeddings')
        .select('embedding')
        .eq('work_id', workId)
        .maybeSingle();

      if (!seedEmbedding) continue;

      const { data: similar } = await supabaseAdmin.rpc('search_works', {
        query_embedding: seedEmbedding.embedding,
        match_threshold: 0.3,
        match_count: 10,
      });

      for (const w of (similar || []) as any[]) {
        if (seenIds.has(w.id)) continue;
        scoreMap.set(w.id, (scoreMap.get(w.id) || 0) + (w.similarity || 0));
      }
    }
  }

  if (scoreMap.size > 0) {
    const scoredIds = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const { data: works } = await supabaseAdmin
      .from('works')
      .select(WORK_SELECT)
      .in('id', scoredIds)
      .neq('status', 'draft');

    const workMap = new Map((works || []).map((w: any) => [w.id, mapWork(w)]));
    return scoredIds.map((id) => workMap.get(id)).filter(Boolean);
  }

  const { data: works } = await supabaseAdmin
    .from('works')
    .select(WORK_SELECT)
    .neq('status', 'draft')
    .order('view_count', { ascending: false })
    .limit(10);

  return (works || []).map(mapWork);
}
