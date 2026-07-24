import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';
import { FcmTokenModel } from '../models/fcm_token.model';
import { NotificationModel } from '../models/notification.model';

export const saveFcmToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
    await FcmTokenModel.save(req.user!.id, token, platform || 'android');
    res.json({ message: 'FCM token saved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await NotificationModel.getByUser(req.user!.id);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await NotificationModel.markAsRead(req.params.id as string);
    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await NotificationModel.getUnreadCount(req.user!.id);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
