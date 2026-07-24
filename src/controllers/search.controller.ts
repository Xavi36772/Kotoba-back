import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { getEmbedding } from '../services/embedding.service';
import { WORK_SELECT } from '../models/work.model';

export const searchWorks = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string || '').trim();
    const genreFilter = req.query.genre as string | undefined;

    function applyGenreFilter(query: any, genre?: string) {
      if (!genre || genre === 'Todos') return query;
      return query.contains('genres', [genre]);
    }

    if (!query) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    // 1. Generar embedding de la query via BETO
    let embedding: number[];
    const sanitizedQuery = query.replace(/[\\%_]/g, '\\$&');
    try {
      embedding = await getEmbedding(query);
    } catch (_) {
      // Fallback: si el search-service no está disponible, búsqueda textual
      let fbQuery = supabase
        .from('works')
        .select(WORK_SELECT)
        .or(`title.ilike.%${sanitizedQuery}%,synopsis.ilike.%${sanitizedQuery}%`)
        .neq('status', 'draft')
        .limit(20);
      fbQuery = applyGenreFilter(fbQuery, genreFilter);
      const { data, error } = await fbQuery;
      if (error) throw error;
      res.json({ results: (data || []).map(mapSearchWork), mode: 'textual' });
      return;
    }

    // 2. Búsqueda vectorial con pgvector
    const { data, error } = await supabase.rpc('search_works', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: 20,
    });
    if (error) throw error;

    let results = (data || []).map(mapSearchWork);
    if (genreFilter && genreFilter !== 'Todos') {
      results = results.filter((w: any) => w.genres?.includes(genreFilter));
    }

    // 3. Fallback textual si la búsqueda semántica no encontró nada
    if (results.length === 0) {
      let fbQuery = supabase
        .from('works')
        .select(WORK_SELECT)
        .or(`title.ilike.%${sanitizedQuery}%,synopsis.ilike.%${sanitizedQuery}%`)
        .neq('status', 'draft')
        .limit(20);
      fbQuery = applyGenreFilter(fbQuery, genreFilter);
      const { data: fallbackData, error: fallbackError } = await fbQuery;
      if (fallbackError) throw fallbackError;
      res.json({ results: (fallbackData || []).map(mapSearchWork), mode: 'textual', query });
      return;
    }

    res.json({ results, mode: 'semantic', query });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error en búsqueda' });
  }
};

function mapSearchWork(w: any) {
  return {
    id: w.id,
    title: w.title,
    author_id: w.author_id,
    author_name: w.users?.username || w.author_name || '',
    cover_url: w.cover_url,
    synopsis: w.synopsis,
    genres: w.genres || [],
    tags: w.tags || [],
    status: w.status,
    chapter_count: w.chapter_count ?? w.chapters?.[0]?.count ?? 0,
    rating: w.rating ?? 0,
    view_count: w.view_count ?? 0,
    similarity: w.similarity ?? undefined,
  };
}
