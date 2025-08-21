import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Paper,
  Fade,
  Slide,
  Grow,
  styled,
  useTheme
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error,
  FileUpload,
  UploadFile,
  CloudUpload
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[24],
    maxWidth: 500,
    width: '100%',
    margin: 16,
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.5,
      transform: 'scale(1.1)',
    },
    '100%': {
      opacity: 1,
      transform: 'scale(1)',
    },
  },
}));

const FileProgressItem = styled(Paper)(({ theme }) => ({
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
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[4],
  },
}));

const OverallProgressContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  borderRadius: 12,
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.contrastText,
  boxShadow: theme.shadows[4],
}));

// Transition component
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

interface UploadProgressModalProps {
  open: boolean;
  onClose: () => void;
  files: UploadFile[];
  overallProgress: number;
  isUploading: boolean;
  fileProgress?: {[key: string]: number};
}

const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  open,
  onClose,
  files,
  overallProgress,
  isUploading,
  fileProgress = {}
}) => {
  const theme = useTheme();
  const completedFiles = files?.filter(f => f.status === 'completed').length || 0;
  const totalFiles = files?.length || 0;
  const hasErrors = files?.some(f => f.status === 'error') || false;

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'uploading':
        return <FileUpload color="primary" />;
      default:
        return <UploadFile color="action" />;
    }
  };

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

  const getStatusText = () => {
    if (hasErrors) return 'Upload completed with errors';
    if (completedFiles === totalFiles) return 'Upload completed successfully';
    if (isUploading) return 'Uploading files...';
    return 'Upload pending';
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Upload Progress
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Overall Progress */}
        <OverallProgressContainer>
          <Fade in={true} timeout={500}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ 
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  letterSpacing: '0.5px'
                }}>
                  {getStatusText()}
                </Typography>
                <Chip 
                  label={`${completedFiles}/${totalFiles}`}
                  color="primary"
                  variant="filled"
                  sx={{ color: theme.palette.primary.contrastText }}
                />
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={overallProgress} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${theme.palette.secondary.light} 0%, ${theme.palette.secondary.main} 100%)`,
                    borderRadius: 5,
                  }
                }}
              />
              
              {/* Stage Progress Indicator */}
              {isUploading && (
                <Box sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                      Stage Progress
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                      {Math.round(overallProgress)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={overallProgress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                        borderRadius: 3,
                      }
                    }}
                  />
                </Box>
              )}
              
              <Typography variant="body2" sx={{ 
                mt: 1.5, 
                opacity: 0.95, 
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {Math.round(overallProgress)}% complete
              </Typography>
              
              {/* Show current stage for uploading files */}
              {isUploading && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)`,
                  borderRadius: 2,
                  border: `1px solid rgba(255,255,255,0.2)`,
                  backdropFilter: 'blur(10px)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ 
                      width: 10, 
                      height: 10, 
                      borderRadius: '50%', 
                      background: `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                      mr: 1.5,
                      animation: 'pulse 1.5s ease-in-out infinite',
                      boxShadow: `0 0 10px ${theme.palette.success.main}40`
                    }} />
                    <Typography variant="body2" fontWeight="bold" sx={{ color: theme.palette.primary.contrastText }}>
                      Current Stage:
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ 
                    opacity: 0.95, 
                    pl: 3.5,
                    color: theme.palette.primary.contrastText,
                    fontWeight: 500
                  }}>
                    {files.find(f => f.status === 'uploading')?.currentStep || 'Processing files...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        </OverallProgressContainer>

        {/* File List */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="medium">
            File Details
          </Typography>
          
          {files?.map((file, index) => (
            <Grow in={true} timeout={300 + index * 100} key={file.id}>
              <FileProgressItem>
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
                      <Box sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        background: `linear-gradient(135deg, ${theme.palette.info.light}20 0%, ${theme.palette.info.main}20 100%)`,
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.info.main}30`
                      }}>
                        <Typography variant="caption" color="info.main" fontWeight="bold">
                          {file.currentStep}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {file.status === 'uploading' && (
                    <Box sx={{ width: 60, mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={fileProgress[file.id] || file.progress || 0} 
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
                </Box>
              </FileProgressItem>
            </Grow>
          ))}
        </Box>

        {/* Summary */}
        <Fade in={true} timeout={800}>
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
            <Typography variant="body2" color="textSecondary">
              {hasErrors ? (
                `${completedFiles} files uploaded successfully, ${totalFiles - completedFiles} failed`
              ) : (
                `${completedFiles} of ${totalFiles} files processed`
              )}
            </Typography>
          </Box>
        </Fade>
      </DialogContent>
    </StyledDialog>
  );
};

export default UploadProgressModal; 