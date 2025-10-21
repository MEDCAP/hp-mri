export interface MRDFile {
  _id: string;
  fileName: string;
  studyDate: string;
  studyTime: string;
  ownerName: string;
  subjectType: string;
  groupName: string | null;  // null for private files
  ownerId: string;           // Cognito sub of the owner
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