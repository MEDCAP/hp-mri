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
import { Job, JobStatus, MRDFile } from '../../api/types';
import { isTerminalJobStatus } from '../../api/jobs';
import { stageLabel } from './pipeline';

/**
 * One file's reconstruction: its job once POST /recon answered, or the error
 * that kept it from starting (or from being polled).
 */
export interface ReconRun {
  file: MRDFile;
  job: Job | null;
  error: string | null;
}

/** The run's status as one value, with a failure to start counted as failed. */
const runStatus = (run: ReconRun): JobStatus =>
  run.error ? 'failed' : run.job?.status ?? 'queued';

/** Fraction of the run that is finished, 0..1. */
const runProgress = (run: ReconRun): number => {
  if (isTerminalJobStatus(runStatus(run))) return 1;
  const stages = run.job?.stages ?? [];
  if (stages.length === 0) return 0;
  return stages.filter((stage) => isTerminalJobStatus(stage.status)).length / stages.length;
};

const StageProgressItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  margin: theme.spacing(1, 0),
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const FileSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: 12,
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
  runs: ReconRun[];
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

const ReconProgressModal: React.FC<ReconProgressModalProps> = ({ open, onClose, runs }) => {
  const theme = useTheme();
  const total = runs.length;
  const statuses = runs.map(runStatus);
  const finished = statuses.filter(isTerminalJobStatus).length;
  const failed = statuses.filter((status) => status === 'failed').length;
  const succeeded = statuses.filter((status) => status === 'succeeded').length;
  const overallProgress =
    total === 0 ? 0 : (runs.reduce((sum, run) => sum + runProgress(run), 0) / total) * 100;
  const noun = total === 1 ? 'file' : 'files';

  const getStatusText = () => {
    if (total === 0) return 'Starting reconstruction...';
    if (finished < total) return `Reconstructing ${total} ${noun}...`;
    if (failed === 0) return `Reconstruction completed for ${total} ${noun}`;
    if (succeeded === 0) return total === 1 ? 'Reconstruction failed' : 'All reconstructions failed';
    return `${failed} of ${total} reconstructions failed`;
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      paperMaxHeight="90vh"
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
                  label={`${finished}/${total} ${noun}`}
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

              <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.95, fontWeight: 500 }}>
                {Math.round(overallProgress)}% complete
              </Typography>
            </Box>
          </Fade>
        </OverallProgressContainer>

        <Typography variant="subtitle2" gutterBottom fontWeight="medium">
          Stage Details
        </Typography>

        {runs.map((run, runIndex) => {
          const status = runStatus(run);
          const stages = run.job?.stages ?? [];
          const runningStage = stages.find((stage) => stage.status === 'running');
          return (
            <Grow in={true} timeout={300 + runIndex * 100} key={run.file._id}>
              <FileSection variant="outlined">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {getStatusIcon(status)}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight="bold" noWrap title={run.file.fileName}>
                      {run.file.fileName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {status === 'running' && runningStage
                        ? `Running: ${stageLabel(runningStage.id)}`
                        : status === 'queued'
                          ? 'Waiting for a worker...'
                          : run.job?.output_file_id
                            ? 'The reconstructed file is now listed with your MRD files.'
                            : `${stages.filter((s) => isTerminalJobStatus(s.status)).length} of ${stages.length} stages finished`}
                    </Typography>
                  </Box>
                  <Chip label={status} size="small" color={getStatusColor(status)} />
                </Box>

                {run.error && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {run.error}
                  </Alert>
                )}
                {!run.error && run.job?.status === 'failed' && run.job.error && (
                  <Alert severity="error" sx={{ mt: 1.5 }}>
                    {run.job.error}
                  </Alert>
                )}

                {stages.map((stage, index) => (
                  <StageProgressItem key={stage.id} variant="outlined">
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      {getStatusIcon(stage.status)}
                      <Box sx={{ ml: 2, flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {stageLabel(stage.id)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Stage {index + 1} of {stages.length}
                        </Typography>
                        {stage.error && (
                          <Typography variant="caption" color="error.main" fontWeight="bold" component="div" sx={{ mt: 0.5 }}>
                            {stage.error}
                          </Typography>
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
                ))}
              </FileSection>
            </Grow>
          );
        })}
      </DialogContent>
    </StyledDialog>
  );
};

export default ReconProgressModal;
