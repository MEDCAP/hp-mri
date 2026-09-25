import React from 'react';
import {
  Checkbox,
  Chip,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { formatStudyTime, formatUploadTimestamp } from '../../../utils/format';
import { MRDFile, fileVisibility } from '../../../types/mrd';
import { SortConfig } from '../hooks/useFileList';

const COLUMNS: { key: keyof MRDFile; label: string }[] = [
  { key: 'fileName', label: 'File Name' },
  { key: 'studyDate', label: 'Study Date' },
  { key: 'upload_timestamp', label: 'Upload Date' },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'groupName', label: 'Visibility' },
];

const SELECTED_BG = alpha('#011F5B', 0.13);
const SELECTED_HOVER_BG = alpha('#011F5B', 0.18);

interface FilesTableProps {
  sortedFiles: MRDFile[];
  sortConfig: SortConfig;
  /** Guests get no checkboxes: they can't act on files. */
  showCheckboxes: boolean;
  onSort: (key: keyof MRDFile) => void;
  onRowClick: (file: MRDFile) => void;
  onRowDoubleClick: (file: MRDFile) => void;
  onToggle: (fileId: string) => void;
}

const FilesTable: React.FC<FilesTableProps> = ({
  sortedFiles,
  sortConfig,
  showCheckboxes,
  onSort,
  onRowClick,
  onRowDoubleClick,
  onToggle,
}) => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {showCheckboxes && <TableCell />}
            {COLUMNS.map(({ key, label }) => (
              <TableCell key={key} onClick={() => onSort(key)} sx={{ cursor: 'pointer' }}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {label}{' '}
                  {sortConfig.key === key && (
                    <IconButton size="small" sx={{ padding: 0, marginLeft: 0.5, verticalAlign: 'middle' }}>
                      {sortConfig.direction === 'asc' ? (
                        <ArrowUpward fontSize="small" />
                      ) : (
                        <ArrowDownward fontSize="small" />
                      )}
                    </IconButton>
                  )}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedFiles.map((file) => {
            const visibility = fileVisibility(file);
            return (
              <TableRow
                key={file._id}
                onClick={() => onRowClick(file)}
                onDoubleClick={() => onRowDoubleClick(file)}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: file.isSelected ? SELECTED_BG : 'inherit',
                  '&:hover': { backgroundColor: file.isSelected ? SELECTED_HOVER_BG : '#f1f1f1' },
                }}
              >
                {showCheckboxes && (
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!file.isSelected}
                      onChange={() => onToggle(file._id)}
                      color="primary"
                    />
                  </TableCell>
                )}
                <TableCell>{file.fileName}</TableCell>
                <TableCell>{`${file.studyDate} ${formatStudyTime(file.studyTime)}`}</TableCell>
                <TableCell>{formatUploadTimestamp(file.upload_timestamp)}</TableCell>
                <TableCell>{file.ownerName}</TableCell>
                <TableCell>
                  <Chip
                    label={visibility.label}
                    size="small"
                    variant={visibility.kind === 'private' ? 'filled' : 'outlined'}
                    color={visibility.kind === 'public' ? 'success' : visibility.kind === 'group' ? 'primary' : 'default'}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FilesTable;
