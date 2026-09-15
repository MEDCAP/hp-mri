import { apiClient } from './client';
import { MrdArrayListResponse, MrdArrayResponse } from './types';

// Array lists are small, so they are cached per file for the session.
const arrayListCache = new Map<string, MrdArrayListResponse>();

// A single array response can be tens of megabytes, so this cache is bounded:
// oldest entry is evicted once the limit is reached.
const arrayCache = new Map<string, MrdArrayResponse>();
const MAX_CACHED_ARRAYS = 8;

/** GET /viewer/:id/arrays — list the arrays available in an MRD file. */
export async function fetchMrdArrayList(fileId: string): Promise<MrdArrayListResponse> {
  const cached = arrayListCache.get(fileId);
  if (cached) return cached;

  const response = await apiClient.get<MrdArrayListResponse>(`/viewer/${fileId}/arrays`);
  arrayListCache.set(fileId, response.data);
  return response.data;
}

/** GET /viewer/:id/arrays/:key — fetch one named array's data. */
export async function fetchMrdArray(fileId: string, key: string): Promise<MrdArrayResponse> {
  const cacheKey = `${fileId}|${key}`;
  const cached = arrayCache.get(cacheKey);
  if (cached) return cached;

  const response = await apiClient.get<MrdArrayResponse>(
    `/viewer/${fileId}/arrays/${encodeURIComponent(key)}`
  );

  const oldest = arrayCache.keys().next();
  if (arrayCache.size >= MAX_CACHED_ARRAYS && !oldest.done) {
    arrayCache.delete(oldest.value);
  }
  arrayCache.set(cacheKey, response.data);
  return response.data;
}
