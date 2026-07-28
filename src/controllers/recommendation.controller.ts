import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getRecommendedWorks } from '../services/recommendation.service';

export const getRecommended = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const results = await getRecommendedWorks(userId);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener recomendaciones' });
  }
};
