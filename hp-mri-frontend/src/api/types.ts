import { MRDFile } from '../types/mrd';

export type { MRDFile };

/** Per-file result entry in a delete response. */
export interface DeleteFileResult {
  file_name: string;
  status: string;
  error?: string;
}

/** Response body for DELETE /mrd-file. */
export interface DeleteResponse {
  message?: string;
  deleted_count?: number;
  s3_deleted_count?: number;
  file_results?: DeleteFileResult[];
}

/** Per-file result entry in a POST /upload response. */
export interface UploadFileResult {
  original_filename: string;
  status: string;
  error?: string;
}

/** Response body for POST /upload. */
export interface UploadResponse {
  message: string;
  total_files: number;
  results: UploadFileResult[];
}

/** Response body for GET /viewer/:id. [channel][slice][row][col][frequency][measurement]. */
export interface ImageArrayResponse {
  image_array: number[][][][][][];
  nmr_labels?: string[];
}

/** Response body for GET /viewer/get_pulse_array/:id. Both are [] when the file has none. */
export interface PulseArrayResponse {
  pulse_data: number[][][]; // [channels][samples][measurements]
  pulse_phase: number[][]; // [samples][measurements]
}

/** Response body for GET /viewer/get_gradient_array/:id. Always [] until the backend extracts gradients. */
export interface GradientArrayResponse {
  gx?: number[][];
  gy?: number[][];
  gz?: number[][];
}
