import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tooltip,
  Fade,
  Zoom,
  styled,
  keyframes,
  useTheme
} from '@mui/material';
import {
  CloudUpload,
  ExpandMore,
  CheckCircle,
  Error
} from '@mui/icons-material';

// Animation keyframes
const jiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg); }
  75% { transform: rotate(2deg); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;



// Styled components
const ProgressIndicator = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: 60,
  height: 60,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: theme.shadows[8],
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: theme.shadows[12],
    animation: `${jiggle} 0.5s ease-in-out`,
  },
  zIndex: 1300,
}));

const SpinningIcon = styled(CloudUpload, {
  shouldForwardProp: (prop) => prop !== 'isUploading'
})<{ isUploading: boolean }>(({ theme, isUploading }) => ({
  fontSize: 24,
  color: theme.palette.primary.main,
  animation: isUploading ? `${spin} 2s linear infinite` : 'none',
}));

const ProgressRing = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUploading'
})<{ isUploading: boolean }>(({ theme, isUploading }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  border: `3px solid ${theme.palette.grey[200]}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -3,
    left: -3,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: `3px solid transparent`,
    borderTop: `3px solid ${theme.palette.primary.main}`,
    animation: isUploading ? `${spin} 1s linear infinite` : 'none',
  },
}));

const ProgressBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -8,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 80,
  height: 4,
  backgroundColor: theme.palette.grey[200],
  borderRadius: 2,
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: theme.palette.primary.main,
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
}));

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface UploadProgressIndicatorProps {
  files: UploadFile[];
  overallProgress: number;
  isUploading: boolean;
  onExpand: () => void;
  isVisible: boolean;
  isCompleted?: boolean;
}

const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  files,
  overallProgress,
  isUploading,
  onExpand,
  isVisible,
  isCompleted = false
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  console.log('UploadProgressIndicator render:', { isVisible, filesCount: files?.length, overallProgress, isUploading });

  const completedFiles = files?.filter(f => f.status === 'completed').length || 0;
  const totalFiles = files?.length || 0;
  const hasErrors = files?.some(f => f.status === 'error') || false;

  const getStatusIcon = () => {
    if (isCompleted) {
      if (hasErrors) return <Error color="error" />;
      return <CheckCircle color="success" />;
    }
    if (hasErrors) return <Error color="error" />;
    if (completedFiles === totalFiles) return <CheckCircle color="success" />;
    return <SpinningIcon isUploading={isUploading} />;
  };

  const getTooltipText = () => {
    if (isCompleted) {
      if (hasErrors) return `Upload completed with errors (${completedFiles}/${totalFiles})`;
      return `Upload completed successfully (${completedFiles}/${totalFiles})`;
    }
    if (hasErrors) return `Upload completed with errors (${completedFiles}/${totalFiles})`;
    if (completedFiles === totalFiles) return `Upload completed (${completedFiles}/${totalFiles})`;
    return `Uploading files (${completedFiles}/${totalFiles}) - ${Math.round(overallProgress)}%`;
  };

  if (!isVisible) return null;

  return (
    <Fade in={isVisible} timeout={300}>
      <Tooltip title={getTooltipText()} placement="left">
        <ProgressIndicator
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onExpand}
          elevation={isHovered ? 12 : 8}
        >
          <Zoom in={true} timeout={200}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getStatusIcon()}
              
              {!isCompleted && <ProgressRing isUploading={isUploading} />}
              
                              {!isCompleted && (
                  <ProgressBar
                    sx={{
                      '&::after': {
                        width: `${overallProgress}%`,
                      },
                    }}
                  />
                )}
              
              {isHovered && (
                <Fade in={true} timeout={200}>
                  <ExpandMore 
                    sx={{ 
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      fontSize: 16,
                      color: theme.palette.primary.main,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: '50%',
                      padding: 0.5,
                      boxShadow: theme.shadows[2],
                    }} 
                  />
                </Fade>
              )}
            </Box>
          </Zoom>
        </ProgressIndicator>
      </Tooltip>
    </Fade>
  );
};

export default UploadProgressIndicator; 