import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CommentModel } from '../models/comment.model';
import { CommentLikeModel } from '../models/comment_like.model';

export const getCommentsByWorkId = async (req: Request, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const comments = await CommentModel.findByWorkId(workId);
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
    const chapterId = req.params.chapterId as string;
    const comments = await CommentModel.findByChapterId(chapterId);
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createComment = async (req: Request, res: Response): Promise<void> => {
  const allowedFields = ['work_id', 'chapter_id', 'user_id', 'content'];
  const clean: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) clean[key] = req.body[key];
  }
  try {
    const comment = await CommentModel.create(clean);
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

export const likeComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const existing = await CommentLikeModel.findByUserAndComment(userId, id);
    if (existing) {
      res.status(409).json({ error: 'Already liked' });
      return;
    }

    await CommentLikeModel.create(userId, id);
    await CommentModel.incrementLikeCount(id);

    const likeCount = await CommentLikeModel.countByComment(id);
    res.json({ liked: true, like_count: likeCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const unlikeComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const existing = await CommentLikeModel.findByUserAndComment(userId, id);
    if (!existing) {
      res.status(404).json({ error: 'Like not found' });
      return;
    }

    await CommentLikeModel.delete(userId, id);
    await CommentModel.decrementLikeCount(id);

    const likeCount = await CommentLikeModel.countByComment(id);
    res.json({ liked: false, like_count: likeCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getCommentLikes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const isLiked = await CommentLikeModel.isLikedByUser(userId, id);
    const likeCount = await CommentLikeModel.countByComment(id);

    res.json({ liked: isLiked, like_count: likeCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getCommentsWithUserLikes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const comments = await CommentModel.findByWorkId(workId);
    const userId = req.user!.id;
    const commentIds = comments.map((c: any) => c.id);

    const likedCommentIds = await CommentLikeModel.getLikedCommentIds(userId, commentIds);
    const likedSet = new Set(likedCommentIds);

    const enriched = comments.map((c: any) => ({
      ...c,
      is_liked: likedSet.has(c.id),
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
