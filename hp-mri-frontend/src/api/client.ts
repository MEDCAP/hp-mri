import axios from 'axios';
import { expireSession, getIdToken } from '../pages/loginpages/cognitoUtils';

/**
 * Single shared axios instance for all API calls.
 * All requests are relative to the `/api` base path (proxied to the backend).
 */
export const apiClient = axios.create({
  baseURL: '/api',
});

// Attach the Cognito ID token when signed in. getSession() refreshes an expired
// token itself, so a failure here means the session is dead: sign out and send
// the request as a guest, which the backend serves public data.
apiClient.interceptors.request.use(async (config) => {
  try {
    const idToken = await getIdToken();
    if (idToken) config.headers.Authorization = `Bearer ${idToken}`;
  } catch {
    expireSession();
  }
  return config;
});

// A 401 means the backend rejected the session: drop to the guest view.
apiClient.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) expireSession();
  return Promise.reject(error);
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
