import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { WorkModel } from '../models/work.model';

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

const allowedFields = ['title', 'synopsis', 'genre', 'cover_url', 'author_id', 'status', 'language', 'tags'];

function sanitize(body: any) {
  const clean: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

export const createWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cleanData = sanitize(req.body);
    cleanData.author_id = req.user!.id;
    const work = await WorkModel.create(cleanData);
    res.status(201).json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateWork = async (req: Request, res: Response): Promise<void> => {
  try {
    const work = await WorkModel.update(req.params.id as string, sanitize(req.body));
    res.json(work);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const incrementWorkView = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await WorkModel.incrementViewCount(req.params.workId as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
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
