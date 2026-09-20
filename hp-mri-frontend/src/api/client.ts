import axios from 'axios';
import { getIdTokenJwt } from '../auth/cognito';

/**
 * Single shared axios instance for all API calls.
 * All requests are relative to the `/api` base path (proxied to the backend).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

/**
 * Attach the Cognito ID token to every API request.
 *
 * Until now the SPA signed users in and then called the API with no
 * credentials at all, so the backend had no way to know who was calling. The
 * backend validates this token when it is present and, once REQUIRE_AUTH is
 * enabled there, requires it.
 *
 * A missing token is not an error here: the request goes out anonymously and
 * the backend decides. That is what lets tokens start flowing before
 * enforcement is switched on.
 *
 * Note this interceptor is only installed on `apiClient`. `putToS3` in
 * uploads.ts deliberately uses bare axios, because sending an Authorization
 * header to a presigned S3 URL invalidates the signature.
 */
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getIdTokenJwt();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Never block a request on token retrieval.
  }
  return config;
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
