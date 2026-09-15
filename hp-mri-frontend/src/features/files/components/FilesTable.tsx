import React from 'react';
import {
  Checkbox,
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
import { formatStudyTime, formatUploadTimestamp } from '../../../utils/format';
import { MRDFile } from '../../../types/mrd';

interface FilesTableProps {
  sortedFiles: MRDFile[];
  sortConfig: { key: keyof MRDFile; direction: 'asc' | 'desc' };
  onSort: (key: keyof MRDFile) => void;
  onSelect: (fileId: string) => void;
  onRowClick: (file: MRDFile) => void;
}

const FilesTable: React.FC<FilesTableProps> = ({
  sortedFiles,
  sortConfig,
  onSort,
  onSelect,
  onRowClick,
}) => {
  return (
    <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            {[{ key: 'fileName', label: 'File Name' }, { key: 'studyDate', label: 'Study Date' }, { key: 'upload_timestamp', label: 'Upload Date' }, { key: 'ownerName', label: 'Owner Name' }].map(({ key, label }) => (
              <TableCell key={key} onClick={() => onSort(key as keyof MRDFile)} sx={{ cursor: 'pointer' }}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {label}{' '}
                  {sortConfig.key === (key as keyof MRDFile) && (
                    <IconButton
                      size="small"
                      sx={{
                        padding: 0,
                        marginLeft: 0.5,
                        verticalAlign: 'middle',
                        transform: 'translateY(0px)',
                      }}
                    >
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
          {sortedFiles.map((file) => (
            <TableRow
              key={file._id}
              sx={{
                '&:hover': {
                  backgroundColor: '#f1f1f1',
                },
              }}
            >
              <TableCell>
                <Checkbox
                  checked={file.isSelected}
                  onChange={() => onSelect(file._id)}
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <Typography
                  variant="body1"
                  sx={{
                    cursor: 'pointer',
                    color: 'secondary.main',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  onClick={() => onRowClick(file)}
                >
                  {file.fileName}
                </Typography>
              </TableCell>
              <TableCell>{`${file.studyDate} ${formatStudyTime(file.studyTime)}`}</TableCell>
              <TableCell>{formatUploadTimestamp(file.upload_timestamp)}</TableCell>
              <TableCell>{file.ownerName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FilesTable;
