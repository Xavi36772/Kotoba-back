import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { WorkModel } from '../models/work.model';
import { getEmbedding } from '../services/embedding.service';
import { supabaseAdmin } from '../config/supabase';

export const getWorks = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: Record<string, string> = {};
    if (req.query.author_id) filters.author_id = req.query.author_id as string;
    const works = await WorkModel.findAll(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(works);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getWorkById = async (req: Request, res: Response): Promise<void> => {
  try {
    const work = await WorkModel.findById(req.params.id as string);
    if (!work) {
      res.status(404).json({ error: 'Work not found' });
      return;
    }
    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const allowedFields = ['title', 'synopsis', 'genre', 'cover_url', 'author_id', 'status', 'language', 'tags', 'updated_at'];

function sanitize(body: any) {
  const clean: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

async function storeEmbedding(workId: string, title: string, synopsis: string) {
  try {
    const text = `${title} ${synopsis}`.trim();
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
    const cleanData = sanitize(req.body);
    cleanData.author_id = req.user!.id;
    const work = await WorkModel.create(cleanData);
    storeEmbedding(work.id, work.title, work.synopsis || '');
    res.status(201).json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateWork = async (req: Request, res: Response): Promise<void> => {
  try {
    const work = await WorkModel.update(req.params.id as string, sanitize(req.body));
    storeEmbedding(work.id, work.title, work.synopsis || '');
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
      .select('id, title, synopsis')
      .neq('status', 'draft');
    if (error) throw error;

    let count = 0;
    for (const w of works || []) {
      const text = `${w.title} ${w.synopsis || ''}`.trim();
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
