import axios from 'axios';

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:8000';

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await axios.post(`${SEARCH_SERVICE_URL}/embed`, { text });
  return res.data.embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await axios.post(`${SEARCH_SERVICE_URL}/embed-batch`, { texts });
  return res.data.embeddings;
}
