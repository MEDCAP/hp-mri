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

/** Response body for POST /uploads/init. */
export interface UploadInitResponse {
  uploadId: string;
  uploadUrl: string;
  expiresIn: number;
}

/** Response body for POST /uploads/:id/complete. */
export interface UploadCompleteResponse {
  fileId: string;
  s3_key: string;
  metadata: Record<string, string>;
}

/**
 * How an MRD array is rendered. The server normalises every array it exposes
 * into one of exactly two layouts, so the viewer needs exactly two renderers.
 */
export type MrdArrayKind = 'image' | 'trace';

/** kind 'image': [channel][slice][row][col][frequency][measurement]. */
export type MrdImageData = number[][][][][][];

/** kind 'trace': [series][sample][measurement]. */
export type MrdTraceData = number[][][];

/** One array available in an MRD file, as listed by GET /viewer/:id/arrays. */
export interface MrdArrayDescriptor {
  key: string;
  /** Human-readable name shown in the panel's array dropdown. */
  name: string;
  kind: MrdArrayKind;
  /** MRD stream union tag the array came from, e.g. 'imageDouble'. */
  tag: string;
  shape: number[];
  dim_labels: string[];
  /** Per-frequency labels (metabolites), [] when the file carries none. */
  labels: string[];
  dtype: string;
  /** 'magnitude' when a complex array was reduced to its magnitude. */
  transform: 'none' | 'magnitude';
  item_count: number;
}

/** Response body for GET /viewer/:id/arrays. */
export interface MrdArrayListResponse {
  file_id: string;
  arrays: MrdArrayDescriptor[];
  /** Stream items the viewer cannot render, e.g. raw acquisitions. */
  unsupported: { tag: string; count: number }[];
}

interface MrdArrayBase extends MrdArrayDescriptor {
  value_min: number;
  value_max: number;
}

/** Response body for GET /viewer/:id/arrays/:key, discriminated on `kind`. */
export type MrdArrayResponse =
  | (MrdArrayBase & { kind: 'image'; data: MrdImageData })
  | (MrdArrayBase & { kind: 'trace'; data: MrdTraceData });
