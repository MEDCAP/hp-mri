import React, { useState, useCallback, useRef } from 'react';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  Divider,
  useTheme,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  PlayArrow as ReconstructIcon
} from '@mui/icons-material';
import UploadModal from '../files/components/UploadModal';
import { UploadFile } from '../files/hooks/useUpload';
import { Transition, StyledDialog, SectionBox } from '../../components/dialogs/AppDialog';
import ParameterTable, { Parameter } from './ParameterTable';
import { isValidValueInput, formatValueOnBlur, isValidWiggleInput, formatWiggleOnBlur } from './reconstructValidation';

interface ReconstructModalProps {
  open: boolean;
  onClose: () => void;
  onReconstructStart?: () => void;
}

// Factory function to create a default parameter with consistent defaults
const createDefaultParameter = (id: string): Parameter => ({
  id,
  name: '',
  value: '',           
  isSource: false,
  isSmallPeak: false,
  isProduct: false,
  wiggle: '1.0',       // default wiggle factor
});

const ReconstructModal: React.FC<ReconstructModalProps> = ({
  open,
  onClose,
  onReconstructStart,
}) => {
  const theme = useTheme();
  const parameterIdCounter = useRef(1);
  const [parameters, setParameters] = useState<Parameter[]>([
    createDefaultParameter('1'),
  ]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add new parameter row
  const handleAddParameter = () => {    
    parameterIdCounter.current += 1;
    setParameters([...parameters, createDefaultParameter(parameterIdCounter.current.toString())]);
  };

  // Remove parameter row
  const handleRemoveParameter = (id: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((param) => param.id !== id));
    }
  };

  // Update parameter name
  const handleNameChange = (id: string, value: string) => {
    setParameters(
      parameters.map((param) =>
        param.id === id ? { ...param, name: value } : param
      )
    );
  };

  // Update parameter value
  const handleValueChange = (id: string, value: string) => {
    if (isValidValueInput(value)) {
      setParameters(parameters.map(p => p.id === id ? { ...p, value } : p));
      setError(null);
    }
  };

  // Handle blur event to validate and reformat frequency offset
  const handleValueBlur = (id: string) => {
    setParameters(parameters.map(param => {
      if (param.id === id) {
        const r = formatValueOnBlur(param.value);
        if (r.error) setError(r.error);
        return { ...param, value: r.value };
      }
      return param;
    }));
  };

  // Update wiggle value (allows positive floats/decimals)
  const handleWiggleChange = (id: string, value: string) => {
    if (isValidWiggleInput(value)) {
      setParameters(parameters.map(p => p.id === id ? { ...p, wiggle: value } : p));
      setError(null);
    }
  };

  // Handle blur event for wiggle - validate and format
  const handleWiggleBlur = (id: string) => {
    setParameters(parameters.map(param => {
      if (param.id === id) {
        const r = formatWiggleOnBlur(param.wiggle);
        if (r.error) setError(r.error);
        return { ...param, wiggle: r.value };
      }
      return param;
    }));
  };

  // Update field boolean value
  const handleFieldToggle = (
    id: string,
    field: 'isSource' | 'isSmallPeak' | 'isProduct'
  ) => {
    setParameters(
      parameters.map((param) =>
        param.id === id ? { ...param, [field]: !param[field] } : param
      )
    );
  };

  // Handle file upload completion from UploadModal
  const handleUploadComplete = useCallback((files: UploadFile[]) => {
    setSelectedFiles(files);
    setUploadModalOpen(false);
    setError(null);
  }, []);

  // Validate and start reconstruction
  const handleReconstruct = () => {
    // Validate that at least one file is selected
    if (selectedFiles.length === 0) {
      setError('Please upload at least one file for reconstruction');
      return;
    }

    // Validate parameters (at least one parameter with name)
    const validParameters = parameters.filter(
      (param) => param.name.trim() !== ''
    );

    if (validParameters.length === 0) {
      setError('Please add at least one metabolite parameter with a name');
      return;
    }

    // Clear error and proceed
    setError(null);

    // TODO: Send reconstruction request to backend
    const reconstructionData = {
      parameters: validParameters.map((param) => ({
        name: param.name,
        value: typeof param.value === 'string' ? parseFloat(param.value) || 0.0 : param.value,
        isSource: param.isSource,
        isSmallPeak: param.isSmallPeak,
        isProduct: param.isProduct,
        wiggle: typeof param.wiggle === 'string' ? parseFloat(param.wiggle) || 1.0 : param.wiggle,
      })),
      files: selectedFiles,
    };

    console.log('Starting reconstruction with data:', reconstructionData);

    // Notify parent component
    onReconstructStart?.();

    // Close modal
    handleClose();
  };

  // Reset and close modal state
  const handleClose = () => {
    parameterIdCounter.current = 1;
    setParameters([createDefaultParameter('1')]);
    setSelectedFiles([]);
    setError(null);
    onClose();
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
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Parameters Section */}
          <SectionBox>
            <ParameterTable
              parameters={parameters}
              onAdd={handleAddParameter}
              onNameChange={handleNameChange}
              onValueChange={handleValueChange}
              onValueBlur={handleValueBlur}
              onWiggleChange={handleWiggleChange}
              onWiggleBlur={handleWiggleBlur}
              onFieldToggle={handleFieldToggle}
              onRemove={handleRemoveParameter}
            />
          </SectionBox>

          <Divider sx={{ my: 3 }} />

          {/* File Upload Section */}
          <SectionBox>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight="medium">
                Select MRD Files
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setUploadModalOpen(true)}
                size="small"
              >
                Select Files
              </Button>
            </Box>

            {selectedFiles.length > 0 ? (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {selectedFiles.length} file(s) selected
                </Typography>
                <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                  {selectedFiles.map((file) => (
                    <Paper
                      key={file.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="body2">{file.file.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="info" variant="outlined">
                No files selected. Click "Select Files" to upload MRD files for
                reconstruction.
              </Alert>
            )}
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
            disabled={selectedFiles.length === 0}
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

      {/* Reuse UploadModal for file selection */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};

export default ReconstructModal;

