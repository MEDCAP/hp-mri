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
  /** MRD meta values the array carries. */
  meta?: MrdMeta;
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

/**
 * MRD meta values, as the viewer endpoints pass them through. Every MRD meta
 * key holds a list, so a scalar such as `fit_loss` arrives as a one-element
 * list and `peak_names` as one entry per peak.
 */
export type MrdMetaValue = number | string;
export type MrdMeta = Record<string, MrdMetaValue[]>;

/** What a staged upload holds: a converted MRD file, or a tar of raw scans. */
export type UploadKind = 'mrd' | 'raw-tar';

/** Response body for POST /uploads/:id/convert and POST /recon. */
export interface JobStartResponse {
  jobId: string;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type JobKind = 'convert' | 'recon';

/** One pipeline stage's progress inside a job. */
export interface JobStageStatus {
  id: string;
  status: JobStatus;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * Response body for GET /jobs/:id. A job is visible only to the user who
 * started it.
 */
export interface Job {
  _id: string;
  kind: JobKind;
  status: JobStatus;
  stages: JobStageStatus[];
  ownerName: string | null;
  input_file_id: string | null;
  staging_upload_id: string | null;
  output_file_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A fitted peak. `name` may not contain an underscore: the recon CLI splits a
 * `-{name}{_modifier} {ppm}` token at its first underscore, so an underscore in
 * the name would be read as the start of the modifier suffix.
 */
export type PeakModifier = 's' | 't' | 'm';

export interface ReconPeak {
  name: string;
  ppm: number;
  /** Concatenated modifier letters, e.g. 'tm', which become the `-ala_tm` suffix. */
  modifiers: string;
}

/**
 * Recon stage parameters. The four tunables are job-level rather than per-peak
 * and are omitted entirely when left blank, so the container falls back to its
 * own defaults.
 */
export interface ReconStageParams {
  peaks: ReconPeak[];
  line_broadening?: number;
  fit_df?: number;
  fit_dw?: number;
  fit_dph?: number;
}

/** A stage in a reconstruction pipeline, discriminated on `id`. */
export type PipelineStage =
  | { id: 'shift'; params: Record<string, never> }
  | { id: 'recon'; params: ReconStageParams };

export type PipelineStageId = PipelineStage['id'];

/** One encoding's folded k-space, as GET /viewer/:id/kspace reduces it. */
export interface KSpaceEncoding {
  ref: number;
  name: string;
  /** Samples per gradient switch. */
  total: number;
  discard_pre: number;
  /** Points of each switch the fft reads. */
  kept: number;
  /** Position within the switch where the echo is expected. */
  echo: number;
  /** [switch][position within switch], summed over views and repetitions. */
  signal: number[][];
  /** Brightest position within the switch, per switch. */
  brightest: number[];
}

/** Response body for GET /viewer/:id/kspace. */
export interface KSpaceResponse {
  nswitch: number;
  encodings: KSpaceEncoding[];
}

/** One time series, decimated server-side. `t` is in seconds. */
export interface WaveformTrace {
  name: string;
  t: number[];
  values: number[];
  /** Samples the trace was decimated from, and the stride that took. */
  samples: number;
  stride: number;
}

/** What the server dropped to keep the response a sane size. */
export interface WaveformDecimation {
  max_points_per_trace: number;
  max_items_per_group: number;
  /** Stream items left out of each group once max_items_per_group was reached. */
  items_omitted: Record<WaveformGroup, number>;
}

/**
 * Response body for GET /viewer/:id/waveforms.
 *
 * `pulses` and `gradients` are empty on every real file today: the pinned MRD
 * fork carries no Pulse or Gradient stream item at all, so only `acquisitions`
 * has traces. That is an empty group, not a failure.
 */
export interface WaveformResponse {
  pulses: WaveformTrace[];
  gradients: WaveformTrace[];
  acquisitions: WaveformTrace[];
  decimation: WaveformDecimation;
}

/** The groups of WaveformResponse that hold traces. */
export type WaveformGroup = 'pulses' | 'gradients' | 'acquisitions';
