import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CommentModel } from '../models/comment.model';

export const getCommentsByWorkId = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await CommentModel.findByWorkId(req.params.workId as string);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createWorkComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const comment = await CommentModel.create({
      work_id: req.params.workId,
      user_id: req.user!.id,
      content: content.trim(),
    });
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getCommentsByChapterId = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await CommentModel.findByChapterId(req.params.chapterId as string);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const commentAllowedFields = ['work_id', 'chapter_id', 'user_id', 'content'];

function sanitizeComment(body: any) {
  const clean: Record<string, any> = {};
  for (const key of commentAllowedFields) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await CommentModel.create(sanitizeComment(req.body));
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    await CommentModel.delete(req.params.id as string);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getcoments = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await CommentModel.findAll();
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
