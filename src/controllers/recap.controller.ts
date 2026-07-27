import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ChapterModel } from '../models/chapter.model';
import { generateRecap } from '../services/recap.service';

export const getRecap = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chapterId } = req.params as { chapterId: string };
    const { progress } = req.body;

    const currentChapter = await ChapterModel.findById(chapterId);
    if (!currentChapter) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }

    const allChapters = await ChapterModel.findByWorkId(currentChapter.work_id);
    const currentIndex = allChapters.findIndex((ch: any) => ch.id === chapterId);

    let previousChapter = null;
    if (currentIndex > 0) {
      previousChapter = allChapters[currentIndex - 1];
    }

    const currentProgress = typeof progress === 'number' ? Math.min(Math.max(progress, 0), 1) : 1;

    const recap = await generateRecap(
      previousChapter ? {
        title: previousChapter.title,
        content: previousChapter.content,
        order_number: previousChapter.order_number,
      } : null,
      {
        title: currentChapter.title,
        content: currentChapter.content,
        order_number: currentChapter.order_number,
      },
      currentProgress
    );

    res.json({ recap });
  } catch (error: any) {
    console.error('Recap generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate recap' });
  }
};
