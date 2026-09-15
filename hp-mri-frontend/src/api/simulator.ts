import { apiClient } from './client';

/** Simulator list entry as consumed by SimulatorPage. */
export interface Simulator {
  id: number;
  name: string;
  sequence: string;
  image: string;
  isSelected: boolean;
}

/**
 * GET /simulator — list available simulators.
 *
 * NOTE: the backend route does not exist yet; this function is kept because
 * SimulatorPage calls it.
 */
export async function listSimulators(): Promise<Simulator[]> {
  const response = await apiClient.get<Simulator[]>('/simulator');
  return response.data;
}
