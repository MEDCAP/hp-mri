import { useState, useMemo, useCallback } from 'react';
import { listMrdFiles } from '../../../api/mrdFiles';
import { MRDFile } from '../../../types/mrd';
import { extractUploadDate } from '../../../utils/format';

export function useFileList() {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MRDFile; direction: 'asc' | 'desc' }>({
    key: 'fileName',
    direction: 'desc',
  });

  const fetchFiles = useCallback(() => {
    listMrdFiles()
      .then((data) => {
        console.log('mrd-files response: ', data);

        // Filter out files with invalid _id before setting the state
        const validFiles = data.filter((file: MRDFile) => {
          if (file && file._id) {
            return true;
          }
          console.warn('Filtering out invalid file object:', file);
          return false;
        });

        setFiles(validFiles);
      })
      .catch((error) => console.error('Error fetching MRD files:', error));
  }, []);

  const filteredFiles = useMemo(() => {
    if (!search) {
        return files;
    }
    const lowercasedFilter = search.toLowerCase();
    return files.filter(
        (file) =>
            // Search by filename, subject type, or owner name
            (file.fileName || '').toLowerCase().includes(lowercasedFilter) ||
            (file.subjectType || '').toLowerCase().includes(lowercasedFilter) ||
            (file.ownerName || '').toLowerCase().includes(lowercasedFilter)
    );
}, [files, search]);

  // Map a file to a primitive the sort comparison can use for the active sort key.
  const sortValue = (file: MRDFile): string | number => {
    const key = sortConfig.key;
    if (key === 'studyDate') return new Date(file.studyDate || '').getTime();
    if (key === 'upload_timestamp') return extractUploadDate(file.upload_timestamp).getTime();
    const value = file[key];
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'boolean') return Number(value);
    return '';
  };

  const sortedFiles = filteredFiles.sort((a, b) => {
    const aValue = sortValue(a);
    const bValue = sortValue(b);
    return aValue < bValue
      ? sortConfig.direction === 'asc'
        ? -1
        : 1
      : sortConfig.direction === 'asc'
        ? 1
        : -1;
  });

  const handleSort = (key: keyof MRDFile) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file._id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  };

  return { files, setFiles, search, setSearch, sortConfig, sortedFiles, fetchFiles, handleSort, handleSelection };
}
