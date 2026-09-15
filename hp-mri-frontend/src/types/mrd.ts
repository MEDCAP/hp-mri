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
  groupName: string;
  isReconstructed: boolean;
  protocolName?: string;
  measurementId?: string;
  stationName?: string;
  original_filename?: string;
  upload_timestamp?: MongoTimestamp; // Can be string or { $date: number } from MongoDB
  file_size?: string;
  s3_key?: string;
  isSelected?: boolean;
} 