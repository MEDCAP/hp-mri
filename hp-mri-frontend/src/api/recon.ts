import { apiClient } from './client';
import { JobStartResponse, PipelineStage } from './types';

/**
 * POST /recon — run a stage chain over a file already in S3 and return the job
 * that tracks it. The output lands as a new MRD file, so nothing is uploaded
 * here: the input is picked from the files the app already holds.
 */
export async function startRecon(
  fileId: string,
  stages: PipelineStage[]
): Promise<JobStartResponse> {
  const response = await apiClient.post<JobStartResponse>('/recon', { fileId, stages });
  return response.data;
}
