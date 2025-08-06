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
  backgroundColor: theme.palette.primary.light,
  borderRadius: 12,
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.contrastText,
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

  console.log('UploadProgressModal render:', { open, filesCount: files?.length, overallProgress, isUploading });

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
                <Typography variant="h6" fontWeight="bold">
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
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.contrastText,
                  }
                }}
              />
              
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                {Math.round(overallProgress)}% complete
              </Typography>
              
              {/* Show current step for uploading files */}
              {isUploading && (
                <Typography variant="caption" sx={{ mt: 1, opacity: 0.8, display: 'block' }}>
                  {files.find(f => f.status === 'uploading')?.currentStep || 'Processing files...'}
                </Typography>
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