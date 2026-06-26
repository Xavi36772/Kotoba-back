import { Request, Response } from 'express';
import { ChapterModel } from '../models/chapter.model';

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
    const chapter = await ChapterModel.create(req.body);
    res.status(201).json(chapter);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateChapter = async (req: Request, res: Response): Promise<void> => {
  try {
    const chapter = await ChapterModel.update(req.params.id as string, req.body);
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
