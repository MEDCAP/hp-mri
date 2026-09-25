import { apiClient } from './client';
import { MRDFile, DeleteResponse } from './types';

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

/** DELETE /mrd-file — delete the given file ids. */
export async function deleteMrdFiles(ids: string[]): Promise<DeleteResponse> {
  const response = await apiClient.delete<DeleteResponse>('/mrd-file', {
    data: { ids },
  });
  return response.data;
}

/**
 * POST /mrd-files/:id/share — move an owned file to one of the caller's groups,
 * or back to private with `null`.
 */
export async function shareMrdFile(id: string, groupName: string | null): Promise<void> {
  await apiClient.post(`/mrd-files/${id}/share`, { groupName });
}
