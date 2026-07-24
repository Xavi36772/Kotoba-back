import axios from 'axios';

const MODERATION_URL = process.env.MODERATION_URL || 'https://kotoba-moderation2.up.railway.app';

export interface ModerationResult {
  flagged: boolean;
  confidence: number;
  reason: string;
  categories: Record<string, boolean>;
}

export async function moderateText(text: string, workId?: string): Promise<ModerationResult> {
  try {
    const res = await axios.post(`${MODERATION_URL}/moderate`, {
      text,
      work_id: workId || null,
    }, { timeout: 30000 });
    return res.data;
  } catch (error: any) {
    console.error('Moderation service error:', error.message);
    return { flagged: false, confidence: 0, reason: 'Moderation unavailable', categories: {} };
  }
}
