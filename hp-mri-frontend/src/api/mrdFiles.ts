import { apiClient } from './client';
import { MRDFile, DeleteResponse } from './types';

/** GET /mrd-files — list all MRD files. */
export async function listMrdFiles(): Promise<MRDFile[]> {
  const response = await apiClient.get<MRDFile[]>('/mrd-files');
  return response.data;
}

/** GET /mrd-files/:id — fetch a single MRD file's metadata. */
export async function getMrdFile(id: string): Promise<MRDFile> {
  const response = await apiClient.get<MRDFile>(`/mrd-files/${id}`);
  return response.data;
}

/** Uploads live in `./uploads` — they go direct to S3, not through this API. */

/** DELETE /mrd-file — delete the given file ids. */
export async function deleteMrdFiles(ids: string[]): Promise<DeleteResponse> {
  const response = await apiClient.delete<DeleteResponse>('/mrd-file', {
    data: { ids },
  });
  return response.data;
}
