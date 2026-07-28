import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { WorkModel } from '../models/work.model';
import { getEmbedding } from '../services/embedding.service';
import { moderateText } from '../services/moderation.service';
import { supabase, supabaseAdmin } from '../config/supabase';

async function getUserIdFromToken(req: Request): Promise<string | null> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch {
    return null;
  }
}

export const getWorks = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: Record<string, string> = {};
    if (req.query.author_id) filters.author_id = req.query.author_id as string;
    if (req.query.genre) filters.genre = req.query.genre as string;
    const currentUserId = await getUserIdFromToken(req);
    const includeDrafts = !!filters.author_id && currentUserId === filters.author_id;
    const works = await WorkModel.findAll(
      Object.keys(filters).length > 0 ? filters : undefined,
      includeDrafts,
    );
    res.json(works);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getWorkById = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = await getUserIdFromToken(req);
    const work = await WorkModel.findById(req.params.id as string, !!currentUserId);
    if (!work) {
      res.status(404).json({ error: 'Work not found' });
      return;
    }
    if (work.status === 'draft' && work.author_id !== currentUserId) {
      res.status(404).json({ error: 'Work not found' });
      return;
    }
    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const VALID_GENRES = [
  'Ciencia Ficción', 'Fantasía', 'Ciberpunk', 'Fantasía Oscura',
  'Thriller', 'Misterio', 'Romance', 'Horror', 'Drama', 'Poesía',
];

const allowedFields = ['title', 'synopsis', 'genres', 'cover_url', 'author_id', 'status', 'language', 'tags', 'updated_at', 'is_mature'];

function sanitize(body: any) {
  const clean: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

function validateGenres(genres: any): string | null {
  if (!Array.isArray(genres)) return 'genres debe ser un arreglo';
  if (genres.length < 1 || genres.length > 3) return 'Debe haber entre 1 y 3 géneros';
  for (const g of genres) {
    if (typeof g !== 'string' || !VALID_GENRES.includes(g)) {
      return `"${g}" no es un género válido`;
    }
  }
  return null;
}

export const getGenres = async (_req: Request, res: Response): Promise<void> => {
  res.json(VALID_GENRES);
};

async function storeEmbedding(workId: string, title: string, synopsis: string, genres?: string[], tags?: string[]) {
  try {
    const parts = [title, synopsis, ...(genres || []), ...(tags || [])];
    const text = parts.filter(Boolean).join(' ').trim();
    if (!text) return;
    const embedding = await getEmbedding(text);
    await supabaseAdmin.from('work_embeddings').upsert(
      { work_id: workId, embedding },
      { onConflict: 'work_id' },
    );
  } catch (_) {
    // Search service not available — skip embedding
  }
}

export const createWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.body.genres !== undefined) {
      const error = validateGenres(req.body.genres);
      if (error) { res.status(400).json({ error }); return; }
    }
    const cleanData = sanitize(req.body);
    cleanData.author_id = req.user!.id;
    if (cleanData.status === 'published') cleanData.status = 'draft';
    const work = await WorkModel.create(cleanData);
    storeEmbedding(work.id, work.title, work.synopsis || '', work.genres, work.tags);

    // Moderate synopsis
    const textToCheck = [work.title, work.synopsis].filter(Boolean).join('\n');
    if (textToCheck.trim()) {
      const result = await moderateText(textToCheck, work.id);
      if (result.flagged) {
        await WorkModel.delete(work.id);
        res.status(400).json({
          error: 'Historia rechazada por moderación',
          reason: result.reason,
          categories: result.categories,
        });
        return;
      }
    }

    res.status(201).json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateWork = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.body.genres !== undefined) {
      const error = validateGenres(req.body.genres);
      if (error) { res.status(400).json({ error }); return; }
    }
    if (req.body.status === 'published') {
      const { count, error: countError } = await supabaseAdmin
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .eq('work_id', req.params.id);
      if (countError) throw countError;
      if (count === 0) {
        res.status(400).json({ error: 'No puedes publicar una historia sin capítulos' });
        return;
      }
    }
    const work = await WorkModel.update(req.params.id as string, sanitize(req.body));
    storeEmbedding(work.id, work.title, work.synopsis || '', work.genres, work.tags);
    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const incrementWorkView = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await WorkModel.incrementViewCount(req.params.workId as string, req.user!.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const reindexWorks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: works, error } = await supabaseAdmin
      .from('works')
      .select('id, title, synopsis, genres, tags')
      .neq('status', 'draft');
    if (error) throw error;

    let count = 0;
    for (const w of works || []) {
      const parts = [w.title, w.synopsis, ...(w.genres || []), ...(w.tags || [])];
      const text = parts.filter(Boolean).join(' ').trim();
      if (!text) continue;
      try {
        const embedding = await getEmbedding(text);
        await supabaseAdmin.from('work_embeddings').upsert(
          { work_id: w.id, embedding },
          { onConflict: 'work_id' },
        );
        count++;
      } catch (_) {
        // skip individual failures
      }
    }
    res.json({ reindexed: count, total: works?.length || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al reindexar' });
  }
};

export const deleteWork = async (req: Request, res: Response): Promise<void> => {
  try {
    await WorkModel.delete(req.params.id as string);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
