import React from 'react';
import { Box, Typography, Chip, LinearProgress, IconButton, Paper, Grow, styled } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Delete, FileUpload, UploadFile } from '@mui/icons-material';
import type { UploadFile as UploadFileItem } from '../hooks/useUpload';

const FileItem = styled(Paper)(({ theme }) => ({
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

// Get status icon
const getStatusIcon = (status: UploadFileItem['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'uploading':
      return <FileUpload color="primary" />;
    default:
      return <UploadFile color="action" />;
  }
};

// Get status color
const getStatusColor = (status: UploadFileItem['status']) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'error';
    case 'uploading':
      return 'primary';
    default:
      return 'default';
  }
};

interface UploadFileListProps {
  files: UploadFileItem[];
  onRemove: (fileId: string) => void;
}

const UploadFileList: React.FC<UploadFileListProps> = ({ files, onRemove }) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="medium">
          Selected Files
        </Typography>
        <Chip
          label={files.length}
          size="small"
          color="primary"
          variant="filled"
          sx={{ minWidth: 24, height: 20 }}
        />
      </Box>

      {files.map((file, index) => (
        <Grow in={true} timeout={300 + index * 100} key={file.id}>
          <FileItem>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {getStatusIcon(file.status)}
              <Box sx={{ ml: 2, flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {file.file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {(file.file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
                {file.currentStep && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                    {file.currentStep}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {file.status === 'uploading' && (
                <Box sx={{ width: 60, mr: 1 }}>
                                        <LinearProgress
                  variant="determinate"
                  value={file.progress}
                  sx={{ height: 4 }}
                />
                </Box>
              )}

              <Chip
                label={file.status}
                size="small"
                color={getStatusColor(file.status)}
                variant="outlined"
              />

              {file.status === 'pending' && (
                <IconButton
                  size="small"
                  onClick={() => onRemove(file.id)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
          </FileItem>
        </Grow>
      ))}
    </Box>
  );
};

export default UploadFileList;
