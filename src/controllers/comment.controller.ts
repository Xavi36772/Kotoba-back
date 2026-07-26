import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CommentModel } from '../models/comment.model';
import { CommentLikeModel } from '../models/comment_like.model';
import { ChapterModel } from '../models/chapter.model';
import { WorkModel } from '../models/work.model';
import { UserModel } from '../models/user.model';
import { sendNotification } from '../services/notification.service';

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

    // Notify work author
    (async () => {
      try {
        const work = await WorkModel.findById(req.params.workId as string);
        if (work && work.author_id !== req.user!.id) {
          const commenter = await UserModel.findById(req.user!.id);
          sendNotification(
            work.author_id,
            'new_comment',
            'Nuevo comentario en tu historia',
            `${commenter?.username || 'Alguien'} comentó en "${work.title}"`,
            { work_id: work.id, comment_id: comment.id }
          );
        }
      } catch (_) {}
    })();
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

export const createChapterComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const comment = await CommentModel.create({
      chapter_id: req.params.chapterId,
      work_id: req.body.work_id,
      user_id: req.user!.id,
      content: content.trim(),
    });
    res.status(201).json(comment);

    // Notify work author about chapter comment
    (async () => {
      try {
        if (!req.body.work_id) return;
        const work = await WorkModel.findById(req.body.work_id);
        const chapter = await ChapterModel.findById(req.params.chapterId as string);
        if (work && work.author_id !== req.user!.id) {
          const commenter = await UserModel.findById(req.user!.id);
          sendNotification(
            work.author_id,
            'new_chapter_comment',
            'Nuevo comentario en tu capítulo',
            `${commenter?.username || 'Alguien'} comentó en "${chapter?.title || 'tu capítulo'}" de "${work.title}"`,
            { work_id: work.id, chapter_id: req.params.chapterId, comment_id: comment.id }
          );
        }
      } catch (_) {}
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getChapterCommentsWithLikes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chapterId = req.params.chapterId as string;
    const comments = await CommentModel.findByChapterId(chapterId);
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

    // Notify comment author
    (async () => {
      try {
        const { data: comment } = await (await import('../config/supabase')).supabaseAdmin
          .from('comments')
          .select('user_id, content')
          .eq('id', id)
          .single();
        if (comment && comment.user_id !== userId) {
          const liker = await UserModel.findById(userId);
          sendNotification(
            comment.user_id,
            'comment_liked',
            'Le gustó tu comentario',
            `${liker?.username || 'Alguien'} le dio me gusta a tu comentario`,
            { comment_id: id }
          );
        }
      } catch (_) {}
    })();
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
