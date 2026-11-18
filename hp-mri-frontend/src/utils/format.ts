import { MongoTimestamp } from '../types/mrd';

/** Normalize the MongoDB upload_timestamp variants into a Date (null if unparseable). */
const toDate = (ts: MongoTimestamp | undefined | null): Date | null => {
  if (ts === undefined || ts === null || ts === '') return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.valueOf()) ? null : d;
  }
  if ('$date' in ts) {
    const d = new Date(ts.$date);
    return isNaN(d.valueOf()) ? null : d;
  }
  return null;
};

export const formatUploadTimestamp = (ts: MongoTimestamp | undefined, fallback = ''): string => {
  const date = toDate(ts);
  return date ? date.toLocaleString() : fallback;
};

/** Date used for sorting by upload_timestamp (epoch 0 when missing/unparseable). */
export const extractUploadDate = (ts: MongoTimestamp | undefined): Date =>
  toDate(ts) ?? new Date(0);

export const formatStudyTime = (timeString: string) => {
  if (!timeString || !timeString.includes(':')) return '';
  const [hour, minute] = timeString.split(':');
  let h = parseInt(hour, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12; // Convert hour to 12-hour format, with 12 for midnight/noon
  return `${h}:${minute}${suffix}`;
};

