/**
 * `upload_timestamp` as it may arrive from MongoDB: either an ISO/epoch value
 * (string or number) or the extended-JSON `{ $date: number }` wrapper, or a
 * native Date once parsed.
 */
export type MongoTimestamp = string | number | Date | { $date: number };

export interface MRDFile {
  _id: string;
  fileName: string;
  studyDate: string;
  studyTime: string;
  ownerName: string;
  subjectType: string;
  groupName: string | null;  // null for private files
  ownerId?: string | null;   // Cognito sub of the owner; absent for guests and legacy files
  isReconstructed: boolean;
  protocolName?: string;
  measurementId?: string;
  stationName?: string;
  original_filename?: string;
  upload_timestamp?: MongoTimestamp;
  file_size?: string;
  s3_key?: string;
  /** A reconstruction's source file. */
  parentFileId?: string;
  /** A reconstruction's stages, in the order they ran. */
  reconStages?: ReconStageRecord[];
  isSelected?: boolean;
}

/** One stage of a reconstruction, as recorded on its output file. */
export interface ReconStageRecord {
  id: string;
  params?: Record<string, unknown> | null;
  /** Container image the stage ran, e.g. ghcr.io/medcap/mrs_to_mrd/mrs-recon:latest. */
  image?: string;
  /** The exact arguments the container ran with. */
  args?: string[];
}

/** The registry page for a container image, when there is one. */
export function containerImageUrl(image: string): string | null {
  const match = /^ghcr\.io\/([^/]+)\/([^:@]+)/.exec(image);
  if (!match) return null;
  const [, owner, path] = match;
  return `https://github.com/orgs/${owner}/packages/container/package/${encodeURIComponent(path)}`;
}

export type FileVisibility =
  | { kind: 'private'; label: 'Private' }
  | { kind: 'group'; label: string }
  | { kind: 'public'; label: 'Public' };

/**
 * Who can see a file, mirroring the backend's access check: the 'public'
 * group and legacy files (no owner, no group) are public; a group name means
 * the group; otherwise the file is private to its owner.
 */
export function fileVisibility(file: Pick<MRDFile, 'groupName' | 'ownerId'>): FileVisibility {
  if (file.groupName === 'public' || (!file.groupName && !file.ownerId)) {
    return { kind: 'public', label: 'Public' };
  }
  if (file.groupName) return { kind: 'group', label: file.groupName };
  return { kind: 'private', label: 'Private' };
}
