import { useState, useMemo, useCallback, useEffect } from 'react';
import { listMrdFiles } from '../../../api/mrdFiles';
import { MRDFile } from '../../../types/mrd';
import { extractUploadDate } from '../../../utils/format';
import { useCurrentUser } from '../../../auth/useCurrentUser';

export type SortConfig = { key: keyof MRDFile; direction: 'asc' | 'desc' };

async function loadFiles(): Promise<MRDFile[]> {
  const data = await listMrdFiles();
  return data.filter((file) => {
    if (file && file._id) return true;
    console.warn('Filtering out invalid file object:', file);
    return false;
  });
}

/**
 * The file list, its search/sort, and the checked-row selection. The backend
 * scopes the list by the caller's token, so it is re-fetched whenever the
 * sign-in state changes.
 */
export function useFileList() {
  const { isSignedIn } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'fileName', direction: 'desc' });

  const fetchFiles = useCallback(() => {
    loadFiles()
      .then(setFiles)
      .catch((error) => console.error('Error fetching MRD files:', error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFiles([]); // don't show the previous user's files while re-fetching
    loadFiles()
      .then((data) => { if (!cancelled) setFiles(data); })
      .catch((error) => console.error('Error fetching MRD files:', error));
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const sortedFiles = useMemo(() => {
    const needle = search.toLowerCase();
    const filtered = needle
      ? files.filter((file) =>
          // Search by filename, subject type, or owner name
          (file.fileName || '').toLowerCase().includes(needle) ||
          (file.subjectType || '').toLowerCase().includes(needle) ||
          (file.ownerName || '').toLowerCase().includes(needle))
      : files;

    // Map a file to a primitive the comparison can use for the active sort key.
    const sortValue = (file: MRDFile): string | number => {
      const key = sortConfig.key;
      if (key === 'studyDate') return new Date(file.studyDate || '').getTime();
      if (key === 'upload_timestamp') return extractUploadDate(file.upload_timestamp).getTime();
      const value = file[key];
      if (typeof value === 'string' || typeof value === 'number') return value;
      if (typeof value === 'boolean') return Number(value);
      return '';
    };
    const sign = sortConfig.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValue(a) < sortValue(b) ? -sign : sign));
  }, [files, search, sortConfig]);

  const selectedFiles = useMemo(() => files.filter((file) => file.isSelected), [files]);

  const handleSort = (key: keyof MRDFile) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  /** Check exactly one row (a plain row click). */
  const selectOnly = (fileId: string) =>
    setFiles((prev) => prev.map((file) => ({ ...file, isSelected: file._id === fileId })));

  /** Toggle one row's checkbox, keeping the rest of the selection. */
  const toggleSelected = (fileId: string) =>
    setFiles((prev) =>
      prev.map((file) => (file._id === fileId ? { ...file, isSelected: !file.isSelected } : file)));

  const clearSelection = () =>
    setFiles((prev) => prev.map((file) => ({ ...file, isSelected: false })));

  const removeFiles = (fileIds: string[]) =>
    setFiles((prev) => prev.filter((file) => !fileIds.includes(file._id)));

  /** Patch one file in place, e.g. after its visibility changes. */
  const patchFile = (fileId: string, changes: Partial<MRDFile>) =>
    setFiles((prev) => prev.map((file) => (file._id === fileId ? { ...file, ...changes } : file)));

  return {
    isSignedIn,
    search, setSearch,
    sortConfig, sortedFiles, selectedFiles,
    fetchFiles, handleSort,
    selectOnly, toggleSelected, clearSelection, removeFiles, patchFile,
  };
}
