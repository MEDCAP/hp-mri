import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Chip,
  Divider,
  useTheme,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as ReconstructIcon
} from '@mui/icons-material';
import { Transition, StyledDialog, SectionBox } from '../../components/dialogs/AppDialog';
import { getApiErrorMessage } from '../../api/client';
import { startRecon } from '../../api/recon';
import { pollJob } from '../../api/jobs';
import { MRDFile } from '../../api/types';
import PipelineBuilder from './PipelineBuilder';
import ReconProgressModal, { ReconRun } from './ReconProgressModal';
import {
  Parameter,
  StageForm,
  StageId,
  TunableKey,
  buildPipelineStages,
  createPeak,
  createStage,
  defaultPipeline,
  referencePeaks,
  validatePipeline
} from './pipeline';
import { formatValueOnBlur, isValidValueInput } from './reconstructValidation';

interface ReconstructModalProps {
  open: boolean;
  onClose: () => void;
  /** The files checked in the file list; each gets its own recon job. */
  files: MRDFile[];
  /** Called each time a run succeeds, so its output joins the caller's file list. */
  onReconstructSucceeded?: () => void;
}

const ReconstructModal: React.FC<ReconstructModalProps> = ({
  open,
  onClose,
  files,
  onReconstructSucceeded,
}) => {
  const theme = useTheme();
  const [stages, setStages] = useState<StageForm[]>(defaultPipeline);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [runs, setRuns] = useState<ReconRun[]>([]);
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => () => pollAbort.current?.abort(), []);

  const updateReconStage = useCallback(
    (update: (peaks: Parameter[]) => Parameter[]) => {
      setStages((prev) =>
        prev.map((stage) =>
          stage.id === 'recon' ? { ...stage, peaks: update(stage.peaks) } : stage
        )
      );
    },
    []
  );

  const handleAddPeak = () => updateReconStage((peaks) => [...peaks, createPeak()]);

  const handleLoadReferencePeaks = () => updateReconStage(() => referencePeaks());

  const handleRemovePeak = (id: string) =>
    updateReconStage((peaks) => (peaks.length > 1 ? peaks.filter((peak) => peak.id !== id) : peaks));

  const handlePeakNameChange = (id: string, value: string) =>
    updateReconStage((peaks) => peaks.map((peak) => (peak.id === id ? { ...peak, name: value } : peak)));

  const handlePeakValueChange = (id: string, value: string) => {
    if (!isValidValueInput(value)) return;
    setError(null);
    updateReconStage((peaks) => peaks.map((peak) => (peak.id === id ? { ...peak, value } : peak)));
  };

  const handlePeakValueBlur = (id: string) =>
    updateReconStage((peaks) =>
      peaks.map((peak) => {
        if (peak.id !== id) return peak;
        const formatted = formatValueOnBlur(peak.value);
        if (formatted.error) setError(formatted.error);
        return { ...peak, value: formatted.value };
      })
    );

  const handlePeakFieldToggle = (
    id: string,
    field: 'isSource' | 'isSmallPeak' | 'isProduct'
  ) =>
    updateReconStage((peaks) =>
      peaks.map((peak) => (peak.id === id ? { ...peak, [field]: !peak[field] } : peak))
    );

  const handleTunableChange = (key: TunableKey, value: string) =>
    setStages((prev) =>
      prev.map((stage) =>
        stage.id === 'recon' ? { ...stage, tunables: { ...stage.tunables, [key]: value } } : stage
      )
    );

  const handleAddStage = (id: StageId) =>
    setStages((prev) => (prev.some((stage) => stage.id === id) ? prev : [...prev, createStage(id)]));

  const handleRemoveStage = (id: StageId) =>
    setStages((prev) => prev.filter((stage) => stage.id !== id));

  const handleMoveStage = (index: number, direction: -1 | 1) =>
    setStages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const resetForm = () => {
    setStages(defaultPipeline());
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleProgressClose = () => {
    pollAbort.current?.abort();
    pollAbort.current = null;
    setProgressOpen(false);
    setRuns([]);
  };

  const updateRun = (fileId: string, patch: Partial<ReconRun>) =>
    setRuns((prev) => prev.map((run) => (run.file._id === fileId ? { ...run, ...patch } : run)));

  const handleReconstruct = async () => {
    if (files.length === 0) {
      setError('Select the MRD files to reconstruct in the file list');
      return;
    }
    const invalid = validatePipeline(stages);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setSubmitting(true);
    const pipeline = buildPipelineStages(stages);
    // Snapshot the selection: it may change while the runs are in flight.
    const targets = [...files];

    // One job per file; the backend runs each as its own Tyger chain.
    const started = await Promise.allSettled(
      targets.map((file) => startRecon(file._id, pipeline))
    );

    setSubmitting(false);
    setRuns(
      targets.map((file, index) => {
        const result = started[index];
        return result.status === 'fulfilled'
          ? { file, job: null, error: null }
          : { file, job: null, error: getApiErrorMessage(result.reason) };
      })
    );
    setProgressOpen(true);
    resetForm();
    onClose();

    pollAbort.current?.abort();
    const controller = new AbortController();
    pollAbort.current = controller;

    await Promise.all(
      targets.map(async (file, index) => {
        const result = started[index];
        if (result.status !== 'fulfilled') return;
        try {
          const finished = await pollJob(
            result.value.jobId,
            (job) => updateRun(file._id, { job }),
            controller.signal
          );
          if (finished.status === 'succeeded') onReconstructSucceeded?.();
        } catch (err) {
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            updateRun(file._id, { error: getApiErrorMessage(err) });
          }
        }
      })
    );
  };

  return (
    <>
      <StyledDialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        maxWidth="md"
        fullWidth
        paperMaxWidth={900}
        paperMaxHeight="90vh"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            MR Spectroscopy Reconstruction
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <SectionBox>
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
              {files.length === 1 ? '1 file selected' : `${files.length} files selected`}
            </Typography>
            {files.length === 0 ? (
              <Alert severity="info" variant="outlined">
                Check the files to reconstruct in the file list first.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {files.map((file) => (
                  <Chip key={file._id} label={file.fileName} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </SectionBox>

          <Divider sx={{ my: 3 }} />

          <SectionBox>
            <PipelineBuilder
              stages={stages}
              onAddStage={handleAddStage}
              onRemoveStage={handleRemoveStage}
              onMoveStage={handleMoveStage}
              onAddPeak={handleAddPeak}
              onLoadReferencePeaks={handleLoadReferencePeaks}
              onPeakNameChange={handlePeakNameChange}
              onPeakValueChange={handlePeakValueChange}
              onPeakValueBlur={handlePeakValueBlur}
              onPeakFieldToggle={handlePeakFieldToggle}
              onRemovePeak={handleRemovePeak}
              onTunableChange={handleTunableChange}
            />
          </SectionBox>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReconstruct}
            startIcon={<ReconstructIcon />}
            disabled={files.length === 0 || stages.length === 0 || submitting}
            sx={{
              minWidth: 140,
              background: theme.palette.primary.main,
              '&:hover': {
                background: theme.palette.primary.dark,
              },
            }}
          >
            {files.length > 1 ? `Reconstruct ${files.length} files` : 'Start Reconstruction'}
          </Button>
        </DialogActions>
      </StyledDialog>

      <ReconProgressModal
        open={progressOpen}
        onClose={handleProgressClose}
        runs={runs}
      />
    </>
  );
};

export default ReconstructModal;
