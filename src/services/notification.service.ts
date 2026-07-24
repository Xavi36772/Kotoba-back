import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FcmTokenModel } from '../models/fcm_token.model';
import { NotificationModel } from '../models/notification.model';

let app: App | null = null;

function initFirebase() {
  if (app) return app;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return null;
  }

  try {
    const parsed = JSON.parse(serviceAccount);
    app = initializeApp({ credential: cert(parsed as any) });
    console.log('Firebase Admin initialized');
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const firebaseApp = initFirebase();
  if (!firebaseApp) return;

  try {
    const tokens = await FcmTokenModel.getTokensByUser(userId);
    if (tokens.length === 0) return;

    const messaging = getMessaging(firebaseApp);
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data || {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    result.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
        FcmTokenModel.removeByToken(tokens[idx]);
      }
    });
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  await NotificationModel.create({ userId, type, title, body, data });
  await sendPushToUser(userId, title, body, data as Record<string, string>);
}
