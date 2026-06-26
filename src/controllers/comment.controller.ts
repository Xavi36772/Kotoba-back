import { Request, Response } from 'express';
import { CommentModel } from '../models/comment.model';

export const getCommentsByChapterId = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await CommentModel.findByChapterId(req.params.chapterId as string);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await CommentModel.create(req.body);
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
