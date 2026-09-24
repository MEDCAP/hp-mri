import { apiClient } from './client';
import { MRDFile, DeleteResponse, UploadResponse } from './types';

/**
 * GET /mrd-files — the files the caller may see. The backend scopes this by
 * the token: guests get the public group; signed-in users also get their own
 * and their groups' files.
 */
export async function listMrdFiles(): Promise<MRDFile[]> {
  const response = await apiClient.get<MRDFile[]>('/mrd-files');
  return response.data;
}

/** GET /mrd-files/:id — fetch a single MRD file's metadata. */
export async function getMrdFile(id: string): Promise<MRDFile> {
  const response = await apiClient.get<MRDFile>(`/mrd-files/${id}`);
  return response.data;
}

/** POST /upload — multipart upload of `mriFiles` / `auxFiles`. */
export async function uploadMrdFiles(formData: FormData): Promise<UploadResponse> {
  const response = await apiClient.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/** DELETE /mrd-file — delete the given file ids. */
export async function deleteMrdFiles(ids: string[]): Promise<DeleteResponse> {
  const response = await apiClient.delete<DeleteResponse>('/mrd-file', {
    data: { ids },
  });
  return response.data;
}
