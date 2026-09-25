import React from 'react';
import { Paper, Box, Typography, Chip, Fade, Grow, Zoom, styled, alpha } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const UploadZone = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragOver'
})<{ isDragOver: boolean }>(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragOver
    ? alpha(theme.palette.primary.main, 0.04)
    : theme.palette.background.paper,
  transition: theme.transitions.create(['border-color', 'background-color', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
    transform: 'scale(1.02)',
  },
  ...(isDragOver && {
    transform: 'scale(1.05)',
    borderWidth: '3px',
  }),
}));

const UploadIcon = styled(CloudUpload, {
  shouldForwardProp: (prop) => prop !== 'isDragOver'
})<{ isDragOver: boolean }>(({ theme, isDragOver }) => ({
  fontSize: 48,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(2),
  transition: theme.transitions.create(['transform', 'color'], {
    duration: theme.transitions.duration.short,
  }),
  ...(isDragOver && {
    animation: 'pulse 1s infinite',
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        color: theme.palette.primary.main,
      },
      '50%': {
        transform: 'scale(1.1)',
        color: theme.palette.primary.dark,
      },
      '100%': {
        transform: 'scale(1)',
        color: theme.palette.primary.main,
      },
    },
  }),
}));

interface UploadDropzoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowseClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowseClick,
  fileInputRef,
  onFileInputChange,
}) => {
  return (
    <>
      {/* Upload Zone */}
      <UploadZone
        isDragOver={isDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => onBrowseClick()}
        elevation={isDragOver ? 4 : 1}
      >
        <Fade in={true} timeout={500}>
          <Box>
            <Zoom in={true} timeout={600}>
              <UploadIcon isDragOver={isDragOver} />
            </Zoom>

            <Grow in={true} timeout={700}>
              <Typography variant="h6" gutterBottom fontWeight="medium">
                Drop MRD files here
              </Typography>
            </Grow>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              or click to browse files
            </Typography>

            <Chip
              label="Supported: .bin, .mrd, .mrd2"
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        </Fade>
      </UploadZone>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".bin,.mrd,.mrd2"
        onChange={(e) => onFileInputChange(e)}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default UploadDropzone;
