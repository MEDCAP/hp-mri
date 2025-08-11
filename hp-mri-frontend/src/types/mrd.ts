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
  upload_timestamp?: any; // Can be string or { $date: number } from MongoDB
  file_size?: string;
  s3_key?: string;
  isSelected?: boolean;
} 