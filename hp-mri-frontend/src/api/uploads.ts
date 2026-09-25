import axios, { AxiosProgressEvent } from 'axios';
import { apiClient } from './client';
import { UploadInitResponse, UploadCompleteResponse } from './types';

/**
 * Presigned direct-to-S3 upload.
 *
 * The browser sends file bytes straight to S3, so the API only handles small JSON
 * requests and is never bound by its own request timeout. Three steps per file:
 * `initUpload` -> `putToS3` -> `completeUpload`. Call `abortUpload` if either of
 * the last two fail, so the staged object is discarded promptly.
 */

/**
 * POST /uploads/init — reserve an upload id and get a presigned PUT URL.
 * `groupName` is who the file will be shared with; `null` keeps it private.
 * The owner comes from the auth token.
 */
export async function initUpload(
  filename: string,
  fileSize: number,
  groupName: string | null
): Promise<UploadInitResponse> {
  const response = await apiClient.post<UploadInitResponse>('/uploads/init', {
    filename,
    fileSize,
    groupName,
  });
  return response.data;
}

/**
 * PUT the file bytes to S3.
 *
 * Deliberately uses a bare axios call rather than `apiClient`: the presigned URL
 * is absolute and any extra header would invalidate the signature. The
 * Content-Type must match what the backend signed (`application/octet-stream`).
 */
export async function putToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (event: AxiosProgressEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': 'application/octet-stream' },
    onUploadProgress: onProgress,
    signal,
  });
}

/** POST /uploads/:id/complete — parse the staged object and record it. */
export async function completeUpload(
  uploadId: string,
  filename: string,
  groupName: string | null
): Promise<UploadCompleteResponse> {
  const response = await apiClient.post<UploadCompleteResponse>(
    `/uploads/${uploadId}/complete`,
    { filename, groupName }
  );
  return response.data;
}

/** POST /uploads/:id/abort — discard a staged upload. Never throws. */
export async function abortUpload(uploadId: string): Promise<void> {
  try {
    await apiClient.post(`/uploads/${uploadId}/abort`);
  } catch {
    // Cleanup is best effort; the bucket lifecycle rule is the backstop.
  }
}
