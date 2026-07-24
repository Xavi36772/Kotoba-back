import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { WorkVoteModel } from '../models/work_vote.model';
import { BookmarkModel } from '../models/bookmark.model';
import { WorkModel } from '../models/work.model';
import { UserModel } from '../models/user.model';
import { sendNotification } from '../services/notification.service';

export const voteWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;
    const { vote } = req.body;

    if (vote !== 1 && vote !== -1) {
      res.status(400).json({ error: 'Vote must be 1 or -1' });
      return;
    }

    await WorkVoteModel.upsert(userId, workId, vote);
    const stats = await WorkVoteModel.getWorkStats(workId);

    // Notify the work author
    if (vote === 1) {
      (async () => {
        try {
          const work = await WorkModel.findById(workId);
          if (work && work.author_id !== userId) {
            const voter = await UserModel.findById(userId);
            sendNotification(
              work.author_id,
              'new_vote',
              'Voto positivo en tu historia',
              `${voter?.username || 'Alguien'} votó positivamente "${work.title}"`,
              { work_id: workId, voter_id: userId }
            );
          }
        } catch (_) {}
      })();
    }

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const unvoteWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;

    await WorkVoteModel.remove(userId, workId);
    const stats = await WorkVoteModel.getWorkStats(workId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getWorkVoteAndBookmarkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workId = req.params.workId as string;
    const userId = req.user!.id;

    const voteData = await WorkVoteModel.findByUserAndWork(userId, workId);
    const bookmarkData = await BookmarkModel.findByUserAndWork(userId, workId);
    res.json({
      user_vote: voteData?.vote ?? 0,
      is_bookmarked: bookmarkData != null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
