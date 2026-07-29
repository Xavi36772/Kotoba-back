import axios from 'axios';

const TAGGING_SERVICE_URL = process.env.TAGGING_SERVICE_URL || 'http://localhost:8001';

export interface PredictTagsResult {
  tags: string[];
  probabilities: number[];
}

export async function predictTags(synopsis: string): Promise<PredictTagsResult | null> {
  try {
    const url = `${TAGGING_SERVICE_URL}/predict-tags`;
    console.log(`[TaggingService] Calling ${url}`);
    const res = await axios.post(url, { synopsis }, { timeout: 15000 });
    console.log(`[TaggingService] Response status=${res.status}`, JSON.stringify(res.data));
    if (res.data.error) {
      console.log(`[TaggingService] Error: ${res.data.error}`);
      return null;
    }
    return res.data;
  } catch (err: any) {
    console.log(`[TaggingService] Request failed:`, err.message);
    return null;
  }
}

export async function predictTagsBatch(synopses: string[]): Promise<(PredictTagsResult | null)[]> {
  try {
    const res = await axios.post(`${TAGGING_SERVICE_URL}/predict-tags-batch`, { synopses }, { timeout: 30000 });
    return res.data.results;
  } catch {
    return synopses.map(() => null);
  }
}
