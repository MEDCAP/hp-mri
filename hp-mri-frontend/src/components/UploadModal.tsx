import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  Fade,
  Slide,
  Grow,
  Zoom,
  styled,
  alpha,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Delete,
  FileUpload,
  UploadFile,
  Cancel,
  Minimize
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { getCurrentUserName } from '../pages/loginpages/cognitoUtils';
import { Group } from '../types/group';
import apiClient from '../api/apiClient';

// Styled components for enhanced Material Design
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[24],
    maxWidth: 600,
    width: '100%',
    margin: 16,
  },
}));

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

// Transition component for dialog
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  currentStep?: string;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete?: (files: UploadFile[]) => void;
  onMinimize?: () => void;
  isUploading?: boolean;
  onUploadStart?: (files: UploadFile[]) => void;
  onProgressUpdate?: (fileId: string, progress: number) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose, onUploadComplete, onMinimize, isUploading: externalIsUploading, onUploadStart, onProgressUpdate }) => {
  const theme = useTheme();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isJiggling, setIsJiggling] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('private');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use external upload state if provided, otherwise use internal state
  const isUploadingState = externalIsUploading !== undefined ? externalIsUploading : isUploading;


  // Fetch user's groups when modal opens
  React.useEffect(() => {
    if (open) {
      fetchUserGroups();
    }
  }, [open]);

  const fetchUserGroups = async () => {
    try {
      const response = await apiClient.get('/groups');
      setUserGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setUserGroups([]);
    }
  };

  // File validation
  const isValidFileType = (file: File): boolean => {
    const validExtensions = ['.bin', '.mrd', '.mrd2'];
    return validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles)
      .filter(file => isValidFileType(file))
      .map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending' as const,
        progress: 0,
      }));

    setFiles(prev => [...prev, ...newFiles]);
    setUploadError(null);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Upload file to backend
  const uploadFile = async (file: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file.file);
      
      // Add current user name from Cognito to form data
      const currentUserName = getCurrentUserName();
      if (currentUserName) {
        formData.append('ownerName', currentUserName);
      } else {
        formData.append('ownerName', 'Unknown');
      }
      
      // Add group selection (null for private files)
      formData.append('groupName', selectedGroup === 'private' ? 'null' : selectedGroup);
      
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'uploading' as const, progress: 0, currentStep: 'Starting upload...' }
          : f
      ));
      onProgressUpdate?.(file.id, 0);
      
      // Define processing stages with smooth progress
      const stages = [
        { name: 'Validating file...', startProgress: 0, endProgress: 10 },
        { name: 'Extracting metadata...', startProgress: 10, endProgress: 30 },
        { name: 'Storing in database...', startProgress: 30, endProgress: 50 },
        { name: 'Uploading to cloud storage...', startProgress: 50, endProgress: 85 },
        { name: 'Finalizing...', startProgress: 85, endProgress: 100 },
        { name: 'Completed!', startProgress: 100, endProgress: 100 }
      ];
      
      let currentStageIndex = 0;
      let currentProgress = 0;
      
      const updateProgress = () => {
        if (currentStageIndex < stages.length) {
          const stage = stages[currentStageIndex];
          
          // Smooth progress within current stage
          const progressIncrement = (stage.endProgress - stage.startProgress) / 20; // 20 steps per stage
          currentProgress = Math.min(stage.endProgress, currentProgress + progressIncrement);
          
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, progress: currentProgress, currentStep: stage.name }
              : f
          ));
          onProgressUpdate?.(file.id, currentProgress);
          
          // Move to next stage if we've reached the end of current stage
          if (currentProgress >= stage.endProgress) {
            currentStageIndex++;
            if (currentStageIndex < stages.length) {
              currentProgress = stages[currentStageIndex].startProgress;
            }
          }
          
          // Continue updating if not completed
          if (currentStageIndex < stages.length) {
            setTimeout(updateProgress, 100); // Update every 100ms for smooth animation
          }
        }
      };
      
      // Start progress updates
      setTimeout(updateProgress, 100);
      
      // Make API call using apiClient (includes JWT token)
      apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(response => {
        // Set progress to 100% and completed status
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, progress: 100, status: 'completed' as const, currentStep: 'Completed!' }
            : f
        ));
        onProgressUpdate?.(file.id, 100);
        
        // Check if this specific file was successful
        const fileResult = response.data?.results?.find((r: any) => 
          r.original_filename === file.file.name
        );
        
        if (fileResult && fileResult.status === 'error') {
          const errorMessage = fileResult.error || 'Upload failed';
          const uploadError = new Error(errorMessage);
          throw uploadError;
        }
        
        resolve();
      })
      .catch(error => {
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'error' as const, error: error.message, currentStep: 'Error occurred' }
            : f
        ));
        
        reject(error);
      });
    });
  };

  // Calculate overall progress
  const overallProgress = files.length > 0 
    ? files.reduce((sum, file) => sum + file.progress, 0) / files.length 
    : 0;

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    // Notify parent component about upload start
    onUploadStart?.(files);

    try {
      // Process files sequentially with progress
      for (const file of files) {
        await uploadFile(file);
      }

      // Call completion callback
      onUploadComplete?.(files);
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
        setFiles([]);
        setIsUploading(false);
      }, 1500);

    } catch (error) {
      setUploadError('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: UploadFile['status']) => {
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
  const getStatusColor = (status: UploadFile['status']) => {
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

  const handleDialogClose = (_event: any, reason: string) => {
    if (isUploadingState && reason === 'backdropClick') {
      // Jiggle animation when trying to close during upload
      setIsJiggling(true);
      setTimeout(() => setIsJiggling(false), 500);
      return;
    }
    onClose();
  };

  try {
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
        {/* Group Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Share with:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Private"
              color={selectedGroup === 'private' ? 'primary' : 'default'}
              onClick={() => setSelectedGroup('private')}
              variant={selectedGroup === 'private' ? 'filled' : 'outlined'}
            />
            {userGroups.map((group) => (
              <Chip
                key={group.name}
                label={group.displayName}
                color={selectedGroup === group.name ? 'primary' : 'default'}
                onClick={() => setSelectedGroup(group.name)}
                variant={selectedGroup === group.name ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
        
        {/* Upload Zone */}
        <UploadZone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
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
                        onClick={() => removeFile(file.id)}
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
  } catch (error) {
    console.error('Error rendering UploadModal:', error);
    return null;
  }
};

export default UploadModal; 