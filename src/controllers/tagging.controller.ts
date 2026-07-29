import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { predictTags } from '../services/tagging.service';

export const predictTagsHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { synopsis } = req.body;
    if (!synopsis || typeof synopsis !== 'string' || !synopsis.trim()) {
      res.status(400).json({ error: 'Synopsis is required' });
      return;
    }
    const result = await predictTags(synopsis);
    if (!result) {
      res.status(503).json({ error: 'Tagging service not available' });
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
