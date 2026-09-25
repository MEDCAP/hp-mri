import React, { useState, useRef } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  Alert,
  Fade,
  styled,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  Close,
  UploadFile,
  Cancel,
  Minimize
} from '@mui/icons-material';
import { Transition, StyledDialog } from '../../../components/dialogs/AppDialog';
import { UploadFile as UploadFileType, useUpload } from '../hooks/useUpload';
import UploadDropzone from './UploadDropzone';
import UploadFileList from './UploadFileList';
import GroupSelect from './GroupSelect';

const JigglingDialog = styled(StyledDialog)<{ isJiggling: boolean }>(({ theme, isJiggling }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[24],
    maxWidth: 600,
    width: '100%',
    margin: 16,
    ...(isJiggling && {
      animation: 'jiggle 0.5s ease-in-out',
      '@keyframes jiggle': {
        '0%, 100%': { transform: 'translateX(0)' },
        '25%': { transform: 'translateX(-5px)' },
        '75%': { transform: 'translateX(5px)' },
      },
    }),
  },
}));

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete?: (files: UploadFileType[]) => void;
  onMinimize?: () => void;
  isUploading?: boolean;
  onUploadStart?: (files: UploadFileType[]) => void;
  onProgressUpdate?: (fileId: string, progress: number) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose, onUploadComplete, onMinimize, isUploading: externalIsUploading, onUploadStart, onProgressUpdate }) => {
  const theme = useTheme();
  const [isJiggling, setIsJiggling] = useState(false);
  // Private by default; the uploader opts in to sharing.
  const [groupName, setGroupName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    isDragOver,
    isUploading,
    uploadError,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    handleUpload,
    overallProgress,
  } = useUpload({ onUploadStart, onUploadComplete, onClose, onProgressUpdate, groupName });

  // Use external upload state if provided, otherwise use internal state
  const isUploadingState = externalIsUploading !== undefined ? externalIsUploading : isUploading;

  const handleDialogClose = (_event: object, reason: string) => {
    if (isUploadingState && reason === 'backdropClick') {
      // Jiggle animation when trying to close during upload
      setIsJiggling(true);
      setTimeout(() => setIsJiggling(false), 500);
      return;
    }
    onClose();
  };

  return (
      <JigglingDialog
        open={open}
        onClose={handleDialogClose}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
        isJiggling={isJiggling}
      >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" fontWeight="bold">
          Upload MRD Files
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isUploadingState && onMinimize && (
            <Tooltip title="Minimize">
              <Button
                variant="outlined"
                size="small"
                onClick={onMinimize}
                startIcon={<Minimize />}
                sx={{
                  minWidth: 100,
                  fontSize: '0.875rem'
                }}
              >
                Minimize
              </Button>
            </Tooltip>
          )}
          {!isUploadingState && (
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ mt: 1, mb: 2 }}>
          <GroupSelect
            label="Share with"
            value={groupName}
            onChange={setGroupName}
            disabled={isUploadingState}
          />
        </Box>

        <UploadDropzone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onBrowseClick={() => fileInputRef.current?.click()}
          fileInputRef={fileInputRef}
          onFileInputChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Error Alert */}
        {uploadError && (
          <Fade in={true} timeout={300}>
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          </Fade>
        )}

        {/* Overall Progress Bar */}
        {isUploadingState && files.length > 0 && (
          <Fade in={true} timeout={400}>
            <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.primary.light, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="medium" color="primary.contrastText">
                  Overall Progress
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  {Math.round(overallProgress)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={overallProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.contrastText,
                  }
                }}
              />

              {/* Current Stage Display */}
              {isUploadingState && (
                <Box sx={{ mt: 1.5, p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight="medium" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                    Current Stage:
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText" sx={{ mt: 0.5 }}>
                    {files.find(f => f.status === 'uploading')?.currentStep || 'Processing files...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        )}

        {/* File List */}
        {files.length > 0 && (
          <UploadFileList files={files} onRemove={removeFile} />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={isUploading}
          startIcon={<Cancel />}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          startIcon={<UploadFile />}
          sx={{
            minWidth: 120,
            background: theme.palette.primary.main,
            '&:hover': {
              background: theme.palette.primary.dark,
            }
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </DialogActions>
    </JigglingDialog>
  );
};

export default UploadModal;
