import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Paper,
  Radio,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as ReconstructIcon
} from '@mui/icons-material';
import { Transition, StyledDialog, SectionBox } from '../../components/dialogs/AppDialog';
import { getApiErrorMessage } from '../../api/client';
import { listMrdFiles } from '../../api/mrdFiles';
import { startRecon } from '../../api/recon';
import { pollJob } from '../../api/jobs';
import { Job, MRDFile } from '../../api/types';
import PipelineBuilder from './PipelineBuilder';
import ReconProgressModal from './ReconProgressModal';
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
  onReconstructStart?: () => void;
}

const ReconstructModal: React.FC<ReconstructModalProps> = ({
  open,
  onClose,
  onReconstructStart,
}) => {
  const theme = useTheme();
  const [stages, setStages] = useState<StageForm[]>(defaultPipeline);
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFilesLoading(true);
    listMrdFiles()
      .then((loaded) => {
        if (!cancelled) setFiles(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
    setSelectedFileId(null);
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
    setJob(null);
    setJobError(null);
  };

  const handleReconstruct = async () => {
    if (!selectedFileId) {
      setError('Select the MRD file to reconstruct');
      return;
    }
    const invalid = validatePipeline(stages);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setSubmitting(true);
    setJob(null);
    setJobError(null);

    let jobId: string;
    try {
      ({ jobId } = await startRecon(selectedFileId, buildPipelineStages(stages)));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setProgressOpen(true);
    onReconstructStart?.();
    resetForm();
    onClose();

    const controller = new AbortController();
    pollAbort.current = controller;
    try {
      await pollJob(jobId, setJob, controller.signal);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setJobError(getApiErrorMessage(err));
      }
    }
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
            <Typography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>
              Source MRD File
            </Typography>

            {filesLoading ? (
              <Typography variant="body2" color="textSecondary">
                Loading files...
              </Typography>
            ) : files.length === 0 ? (
              <Alert severity="info" variant="outlined">
                No MRD files available. Upload and convert a scan first.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>File Name</TableCell>
                      <TableCell>Study Date</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Size</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow
                        key={file._id}
                        hover
                        selected={file._id === selectedFileId}
                        onClick={() => setSelectedFileId(file._id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Radio size="small" checked={file._id === selectedFileId} />
                        </TableCell>
                        <TableCell>{file.fileName}</TableCell>
                        <TableCell>{new Date(file.studyDate).toLocaleDateString()}</TableCell>
                        <TableCell>{file.ownerName}</TableCell>
                        <TableCell>
                          {file.file_size
                            ? `${(Number(file.file_size) / (1024 * 1024)).toFixed(2)} MB`
                            : 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
            disabled={!selectedFileId || stages.length === 0 || submitting}
            sx={{
              minWidth: 140,
              background: theme.palette.primary.main,
              '&:hover': {
                background: theme.palette.primary.dark,
              },
            }}
          >
            Start Reconstruction
          </Button>
        </DialogActions>
      </StyledDialog>

      <ReconProgressModal
        open={progressOpen}
        onClose={handleProgressClose}
        job={job}
        error={jobError}
      />
    </>
  );
};

export default ReconstructModal;
