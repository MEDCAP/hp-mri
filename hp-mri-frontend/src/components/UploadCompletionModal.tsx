import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
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

const FileResultItem = styled(Paper)(({ theme }) => ({
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

const SummaryContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.success.light,
  borderRadius: 12,
  marginBottom: theme.spacing(2),
  color: theme.palette.success.contrastText,
}));

const ErrorSummaryContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.error.light,
  borderRadius: 12,
  marginBottom: theme.spacing(2),
  color: theme.palette.error.contrastText,
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
}

interface UploadCompletionModalProps {
  open: boolean;
  onClose: () => void;
  files: UploadFile[];
}

const UploadCompletionModal: React.FC<UploadCompletionModalProps> = ({
  open,
  onClose,
  files
}) => {
  const theme = useTheme();

  const completedFiles = files?.filter(f => f.status === 'completed').length || 0;
  const totalFiles = files?.length || 0;
  const failedFiles = files?.filter(f => f.status === 'error').length || 0;
  const hasErrors = failedFiles > 0;
  const successRate = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

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

  const getSummaryTitle = () => {
    if (hasErrors) {
      return `Upload Completed with ${failedFiles} Error${failedFiles > 1 ? 's' : ''}`;
    }
    return 'Upload Completed Successfully';
  };

  const getSummaryMessage = () => {
    if (hasErrors) {
      return `${completedFiles} of ${totalFiles} files uploaded successfully`;
    }
    return `All ${totalFiles} files uploaded successfully`;
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
            Upload Summary
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Summary Header */}
        {hasErrors ? (
          <ErrorSummaryContainer>
            <Fade in={true} timeout={500}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {getSummaryTitle()}
                  </Typography>
                  <Chip 
                    label={`${Math.round(successRate)}% Success`}
                    color="error"
                    variant="filled"
                    sx={{ color: theme.palette.error.contrastText }}
                  />
                </Box>
                
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {getSummaryMessage()}
                </Typography>
              </Box>
            </Fade>
          </ErrorSummaryContainer>
        ) : (
          <SummaryContainer>
            <Fade in={true} timeout={500}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {getSummaryTitle()}
                  </Typography>
                  <Chip 
                    label="100% Success"
                    color="success"
                    variant="filled"
                    sx={{ color: theme.palette.success.contrastText }}
                  />
                </Box>
                
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {getSummaryMessage()}
                </Typography>
              </Box>
            </Fade>
          </SummaryContainer>
        )}

        {/* File Results */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="medium">
            File Details
          </Typography>
          
          {files?.map((file, index) => (
            <Grow in={true} timeout={300 + index * 100} key={file.id}>
              <FileResultItem>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {getStatusIcon(file.status)}
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {file.file.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                    {file.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        Error: {file.error}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={file.status}
                    size="small"
                    color={getStatusColor(file.status)}
                    variant="outlined"
                  />
                </Box>
              </FileResultItem>
            </Grow>
          ))}
        </Box>

        {/* Statistics */}
        <Fade in={true} timeout={800}>
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Upload Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`${completedFiles} Successful`} 
                color="success" 
                size="small" 
                variant="outlined"
              />
              {failedFiles > 0 && (
                <Chip 
                  label={`${failedFiles} Failed`} 
                  color="error" 
                  size="small" 
                  variant="outlined"
                />
              )}
              <Chip 
                label={`${Math.round(successRate)}% Success Rate`} 
                color="primary" 
                size="small" 
                variant="outlined"
              />
            </Box>
          </Box>
        </Fade>
      </DialogContent>
    </StyledDialog>
  );
};

export default UploadCompletionModal; 