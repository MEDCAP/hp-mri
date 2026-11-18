import axios, { AxiosProgressEvent } from 'axios';
import { apiClient } from './client';
import {
  UploadInitResponse,
  UploadCompleteResponse,
  UploadKind,
  JobStartResponse,
} from './types';

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
 *
 * `kind` decides the extensions the backend accepts: 'mrd' for an
 * already-converted file, 'raw-tar' for a tar of one scan folder that still has
 * to go through the converter.
 */
export async function initUpload(
  filename: string,
  fileSize: number,
  groupName: string | null,
  kind: UploadKind = 'mrd'
): Promise<UploadInitResponse> {
  const response = await apiClient.post<UploadInitResponse>('/uploads/init', {
    filename,
    fileSize,
    groupName,
    kind,
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
  file: Blob,
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

/**
 * POST /uploads/:id/convert — run a staged tar through the converter.
 *
 * Returns at once with the job that tracks the run; the converted file appears
 * in the file list, owned by the caller and shared with `groupName`, once that
 * job succeeds.
 */
export async function convertUpload(
  uploadId: string,
  filename: string,
  groupName: string | null,
  converter: string
): Promise<JobStartResponse> {
  const response = await apiClient.post<JobStartResponse>(
    `/uploads/${uploadId}/convert`,
    { filename, groupName, converter }
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
