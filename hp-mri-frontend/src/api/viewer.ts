import { apiClient } from './client';
import { ImageArrayResponse, PulseArrayResponse, GradientArrayResponse } from './types';

/** GET /viewer/:id — the file's 6-D image array. */
export async function getImageArray(fileId: string): Promise<ImageArrayResponse> {
  const response = await apiClient.get<ImageArrayResponse>(`/viewer/${fileId}`);
  return response.data;
}

/** GET /viewer/get_pulse_array/:id */
export async function getPulseArray(fileId: string): Promise<PulseArrayResponse> {
  const response = await apiClient.get<PulseArrayResponse>(`/viewer/get_pulse_array/${fileId}`);
  return response.data;
}

/** GET /viewer/get_gradient_array/:id */
export async function getGradientArray(fileId: string): Promise<GradientArrayResponse> {
  const response = await apiClient.get<GradientArrayResponse>(`/viewer/get_gradient_array/${fileId}`);
  return response.data;
}
