import React from 'react';
import {
  DialogTitle,
  DialogContent,
  Alert,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Paper,
  Fade,
  Grow,
  styled,
  useTheme
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
  Autorenew,
  Insights
} from '@mui/icons-material';
import { Transition, StyledDialog } from '../../components/dialogs/AppDialog';
import { Job, JobStatus } from '../../api/types';
import { isTerminalJobStatus } from '../../api/jobs';
import { stageLabel } from './pipeline';

const StageProgressItem = styled(Paper)(({ theme }) => ({
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

interface ReconProgressModalProps {
  open: boolean;
  onClose: () => void;
  job: Job | null;
  /** A failure outside the job itself, e.g. the request that started it. */
  error: string | null;
}

const getStatusIcon = (status: JobStatus) => {
  switch (status) {
    case 'succeeded':
      return <CheckCircle color="success" />;
    case 'failed':
      return <ErrorIcon color="error" />;
    case 'running':
      return <Autorenew color="primary" />;
    default:
      return <HourglassEmpty color="action" />;
  }
};

const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'error';
    case 'running':
      return 'primary';
    default:
      return 'default';
  }
};

const ReconProgressModal: React.FC<ReconProgressModalProps> = ({
  open,
  onClose,
  job,
  error,
}) => {
  const theme = useTheme();
  const stages = job?.stages ?? [];
  const totalStages = stages.length;
  const doneStages = stages.filter((stage) => isTerminalJobStatus(stage.status)).length;
  const overallProgress = totalStages === 0 ? 0 : (doneStages / totalStages) * 100;
  const running = job !== null && !isTerminalJobStatus(job.status);
  const runningStage = stages.find((stage) => stage.status === 'running');

  const getStatusText = () => {
    if (error) return 'Reconstruction could not start';
    if (!job) return 'Starting reconstruction...';
    switch (job.status) {
      case 'succeeded':
        return 'Reconstruction completed successfully';
      case 'failed':
        return 'Reconstruction failed';
      case 'running':
        return 'Reconstruction running...';
      default:
        return 'Reconstruction queued';
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      sx={{
        '@keyframes pulse': {
          '0%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(1.1)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Insights color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Reconstruction Progress
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
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
                  label={`${doneStages}/${totalStages}`}
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

              <Typography variant="body2" sx={{
                mt: 1.5,
                opacity: 0.95,
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {Math.round(overallProgress)}% complete
              </Typography>

              {running && (
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
                    {runningStage ? stageLabel(runningStage.id) : 'Waiting for a worker...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Fade>
        </OverallProgressContainer>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {job?.status === 'failed' && job.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {job.error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="medium">
            Stage Details
          </Typography>

          {stages.map((stage, index) => (
            <Grow in={true} timeout={300 + index * 100} key={stage.id}>
              <StageProgressItem>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {getStatusIcon(stage.status)}
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {stageLabel(stage.id)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Stage {index + 1} of {totalStages}
                    </Typography>
                    {stage.error && (
                      <Box sx={{
                        mt: 1,
                        p: 1.5,
                        background: `linear-gradient(135deg, ${theme.palette.error.light}20 0%, ${theme.palette.error.main}20 100%)`,
                        borderRadius: 1,
                        border: `1px solid ${theme.palette.error.main}30`
                      }}>
                        <Typography variant="caption" color="error.main" fontWeight="bold">
                          {stage.error}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Chip
                  label={stage.status}
                  size="small"
                  color={getStatusColor(stage.status)}
                  variant="outlined"
                />
              </StageProgressItem>
            </Grow>
          ))}
        </Box>

        <Fade in={true} timeout={800}>
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
            <Typography variant="body2" color="textSecondary">
              {job?.output_file_id
                ? 'The reconstructed file is now listed with your MRD files.'
                : `${doneStages} of ${totalStages} stages finished`}
            </Typography>
          </Box>
        </Fade>
      </DialogContent>
    </StyledDialog>
  );
};

export default ReconProgressModal;
