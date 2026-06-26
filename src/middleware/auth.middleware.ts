import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Extend Express Request type to hold user
export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
