import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import {
  saveFcmToken,
  getMyNotifications,
  markNotificationRead,
  getUnreadCount,
} from '../controllers/notification.controller';

const router = Router();

router.post('/fcm-token', verifyToken, saveFcmToken);
router.get('/', verifyToken, getMyNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/:id/read', verifyToken, markNotificationRead);

export default router;
