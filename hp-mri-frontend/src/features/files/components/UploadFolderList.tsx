import React from 'react';
import { Box, Typography, Chip, LinearProgress, IconButton, Paper, Grow, styled } from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Delete,
  Folder,
  Inventory,
  CloudUpload,
  Transform,
} from '@mui/icons-material';
import type { UploadFolder } from '../hooks/useUpload';

const FolderItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const getStatusIcon = (status: UploadFolder['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'packing':
      return <Inventory color="primary" />;
    case 'uploading':
      return <CloudUpload color="primary" />;
    case 'converting':
      return <Transform color="primary" />;
    default:
      return <Folder color="action" />;
  }
};

const getStatusColor = (status: UploadFolder['status']) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    case 'pending':
      return 'default';
    default:
      return 'primary';
  }
};

const STATUS_STEPS: Record<UploadFolder['status'], string> = {
  pending: 'Waiting to start',
  packing: 'Packing the folder into a tar...',
  uploading: 'Uploading to cloud storage...',
  converting: 'Converting on the cluster...',
  completed: 'Completed!',
  error: 'Error occurred',
};

interface UploadFolderListProps {
  folders: UploadFolder[];
  onRemove: (folderId: string) => void;
}

/**
 * The queued experiment folders. A folder takes longer than a file and spends
 * most of that time in the converter, so each row shows which stage it is in
 * rather than only a percentage.
 */
const UploadFolderList: React.FC<UploadFolderListProps> = ({ folders, onRemove }) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="medium">
          Selected Scan Folders
        </Typography>
        <Chip
          label={folders.length}
          size="small"
          color="primary"
          variant="filled"
          sx={{ minWidth: 24, height: 20 }}
        />
      </Box>

      {folders.map((folder, index) => (
        <Grow in={true} timeout={300 + index * 100} key={folder.id}>
          <FolderItem>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              {getStatusIcon(folder.status)}
              <Box sx={{ ml: 2, flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight="medium" noWrap>
                  {folder.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {folder.fileCount} file{folder.fileCount === 1 ? '' : 's'} ·{' '}
                  {(folder.totalBytes / 1024 / 1024).toFixed(2)} MB
                </Typography>
                <Typography
                  variant="caption"
                  color={folder.status === 'error' ? 'error' : 'primary'}
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {folder.error ?? STATUS_STEPS[folder.status]}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {folder.status !== 'pending' && folder.status !== 'error' && (
                <Box sx={{ width: 60, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={folder.progress}
                    sx={{ height: 4 }}
                  />
                </Box>
              )}

              <Chip
                label={folder.status}
                size="small"
                color={getStatusColor(folder.status)}
                variant="outlined"
              />

              {folder.status === 'pending' && (
                <IconButton size="small" onClick={() => onRemove(folder.id)} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
          </FolderItem>
        </Grow>
      ))}
    </Box>
  );
};

export default UploadFolderList;
