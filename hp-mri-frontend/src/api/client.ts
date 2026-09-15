import axios from 'axios';

/**
 * Single shared axios instance for all API calls.
 * All requests are relative to the `/api` base path (proxied to the backend).
 */
export const apiClient = axios.create({
  baseURL: '/api',
});

/**
 * Normalize an unknown error thrown by axios (or anything else) into a
 * human-readable message. Prefers the backend's structured error fields
 * (`response.data.error` / `response.data.details`) and falls back to the
 * error's own message.
 */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; details?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.details) return data.details;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
