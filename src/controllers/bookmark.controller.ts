import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BookmarkModel } from '../models/bookmark.model';

export const getMyBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const bookmarks = await BookmarkModel.findByUser(userId);
    res.json(bookmarks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const bookmarkWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;

    const existing = await BookmarkModel.findByUserAndWork(userId, workId);
    if (existing) {
      res.status(409).json({ error: 'Work already bookmarked' });
      return;
    }

    const bookmark = await BookmarkModel.create(userId, workId);
    res.status(201).json(bookmark);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const checkBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;

    const existing = await BookmarkModel.findByUserAndWork(userId, workId);
    res.json({ bookmarked: existing != null });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const unbookmarkWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;

    await BookmarkModel.remove(userId, workId);
    res.json({ message: 'Bookmark removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
