import { apiClient } from './client';
import {
  MrdArrayListResponse,
  MrdArrayResponse,
  KSpaceResponse,
  WaveformResponse,
} from './types';

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

/**
 * GET /viewer/:id/kspace — the acquisitions folded on the gradient switch.
 *
 * Reduced server-side to one summed image per encoding, because a raw file
 * holds thousands of acquisitions and shipping them as JSON is not viable.
 * The endpoint 404s for a file with no EPSI readout, which is how a spectral
 * file looks; callers treat that as "this view does not apply".
 */
export async function fetchKSpace(fileId: string): Promise<KSpaceResponse> {
  const response = await apiClient.get<KSpaceResponse>(`/viewer/${fileId}/kspace`);
  return response.data;
}

/** GET /viewer/:id/waveforms — pulse, gradient and acquisition time series. */
export async function fetchWaveforms(fileId: string): Promise<WaveformResponse> {
  const response = await apiClient.get<WaveformResponse>(`/viewer/${fileId}/waveforms`);
  return response.data;
}
