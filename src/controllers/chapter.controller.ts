import { Request, Response } from 'express';
import { ChapterModel } from '../models/chapter.model';
import { WorkModel } from '../models/work.model';
import { FollowModel } from '../models/follow.model';
import { moderateText } from '../services/moderation.service';
import { sendNotification } from '../services/notification.service';

const allowedFields = ['work_id', 'title', 'content', 'status', 'order_number'];

function sanitize(body: any) {
  const clean: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

export const getChaptersByWorkId = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapters = await ChapterModel.findByWorkId(req.params.workId as string);
    res.json(chapters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getChapterById = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapter = await ChapterModel.findById(req.params.id as string);
    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }
    res.json(chapter);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapter = await ChapterModel.create(sanitize(req.body));

    // Moderate title + content
    const textToCheck = [chapter.title, chapter.content].filter(Boolean).join('\n');
    if (textToCheck.trim()) {
      const result = await moderateText(textToCheck, chapter.work_id);
      if (result.flagged) {
        await ChapterModel.delete(chapter.id);
        res.status(400).json({
          error: 'Contenido rechazado por moderación',
          reason: result.reason,
          categories: result.categories,
        });
        return;
      }
    }

    res.status(201).json(chapter);

    // Notify followers of the author
    (async () => {
      try {
        const work = await WorkModel.findById(chapter.work_id);
        if (!work) return;
        const followers = await FollowModel.getFollowers(work.author_id) || [];
        for (const f of followers) {
          const userData = (f as any).users;
          const followerId = userData?.id || (f as any).follower_id;
          if (followerId && followerId !== work.author_id) {
            sendNotification(
              followerId,
              'new_chapter',
              'Nuevo capítulo disponible',
              `"${work.title}" tiene un nuevo capítulo: "${chapter.title}"`,
              { work_id: work.id, chapter_id: chapter.id }
            );
          }
        }
      } catch (_) {}
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapter = await ChapterModel.update(req.params.id as string, sanitize(req.body));

    // Moderate updated title + content
    const textToCheck = [chapter.title, chapter.content].filter(Boolean).join('\n');
    if (textToCheck.trim()) {
      const result = await moderateText(textToCheck, chapter.work_id);
      if (result.flagged) {
        await ChapterModel.delete(chapter.id);
        res.status(400).json({
          error: 'Contenido rechazado por moderación',
          reason: result.reason,
          categories: result.categories,
        });
        return;
      }
    }

    res.json(chapter);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    await ChapterModel.delete(req.params.id as string);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapters = await ChapterModel.findAll();
    res.json(chapters);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
