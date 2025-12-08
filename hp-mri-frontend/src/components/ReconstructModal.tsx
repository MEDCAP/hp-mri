import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Radio,
  Divider,
  Tooltip,
  styled,
  useTheme,
  Slide,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  PlayArrow as ReconstructIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import UploadModal from './UploadModal';

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[24],
    maxWidth: 900,
    width: '100%',
    margin: 16,
    maxHeight: '90vh',
  },
}));

const SectionBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: 8,
  marginBottom: theme.spacing(2),
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

interface Parameter {
  id: string;
  name: string;            // name of the metabolite
  value: number | string;  // ppm offset of the metabolite (frequency offset) 
  isSource: boolean;       // flag if the metabolite is source of the HP imaging 
  isSmallPeak: boolean;    // flag if the metabolite not the tallest peak
  isProduct: boolean;      // flag if the metabolite is the product of the metabolism
  wiggle: number | string; // wiggle factor to allow +-variations of peak ppm from offset
}

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
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
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
    // Allow empty string, integers, floats with optional negative sign (including partial inputs like "1." or "-.5")
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setParameters(
        parameters.map((param) =>
          param.id === id ? { ...param, value: value } : param
        )
      );
      setError(null); // Clear any previous error
    }
  };

  // Handle blur event to validate and reformat frequency offset 
  const handleValueBlur = (id: string) => {
    setParameters(
      parameters.map((param) => {
        if (param.id === id) {
          const value = param.value;
          if (value === '' || value === '-' || value === '.' || value === '-.') {
            // Default to 0.00 if empty or invalid partial input
            return { ...param, value: '0.00' };
          }
          const numericValue = parseFloat(value.toString());
          if (isNaN(numericValue)) {
            setError('Please enter a valid number for frequency offset (e.g., 0.00, -2.50, 3.75)');
            return { ...param, value: '0.00' };
          }
          // Format to 2 decimal places
          return { ...param, value: numericValue.toFixed(2) };
        }
        return param;
      })
    );
  };

  // Update wiggle value (allows positive floats/decimals)
  const handleWiggleChange = (id: string, value: string) => {
    // Allow empty string, integers, and floats (including partial inputs like "1." or ".5")
    if (value === '' || /^(\d*\.?\d*)$/.test(value)) {
      setParameters(
        parameters.map((param) =>
          param.id === id ? { ...param, wiggle: value } : param
        )
      );
      setError(null); // Clear any previous error
    }
  };

  // Handle blur event for wiggle - validate and format
  const handleWiggleBlur = (id: string) => {
    setParameters(
      parameters.map((param) => {
        if (param.id === id) {
          const value = param.wiggle;
          if (value === '' || value === '.') {
            // Default to 1.0 if empty or invalid partial input
            return { ...param, wiggle: '1.0' };
          }
          const numericValue = parseFloat(value.toString());
          if (isNaN(numericValue) || numericValue < 0) {
            setError('Please enter a valid positive number for wiggle factor (e.g., 1.0)');
            return { ...param, wiggle: '1.0' };
          }
          // Format to 1 decimal place
          return { ...param, wiggle: numericValue.toFixed(1) };
        }
        return param;
      })
    );
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
  const handleUploadComplete = useCallback((files: any[]) => {
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h6" fontWeight="medium">
                Metabolite Parameters
              </Typography>
              <Tooltip title="Add parameter">
                <IconButton
                  color="primary"
                  onClick={handleAddParameter}
                  size="small"
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>
                      Metabolite Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>
                      Frequency Offset (ppm)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Metabolism Source
                        <Tooltip title="Check if this metabolite is the source of the metabolism" placement="top">
                          <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 90 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Small Peak
                        <Tooltip title="Check if this metabolite is the small peaks to fit to" placement="top">
                          <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 90 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Metabolism Product
                        <Tooltip title="Check if this metabolite is the product of the expected metabolism" placement="top">
                          <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 80 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Wiggle
                        <Tooltip title="Allowed variation in PPM from offset for peak fitting (default value is 1.0=±1/2 ppm variation)" placement="top">
                          <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ width: 50 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parameters.map((param) => (
                    <TableRow key={param.id}>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="e.g., Pyruvate, Lactate"
                          value={param.name}
                          onChange={(e) =>
                            handleNameChange(param.id, e.target.value)
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="0.00"
                          value={param.value}
                          onChange={(e) =>
                            handleValueChange(param.id, e.target.value)
                          }
                          onBlur={() => handleValueBlur(param.id)}
                          variant="outlined"
                          type="text"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Radio
                          checked={param.isSource}
                          onChange={() => handleFieldToggle(param.id, 'isSource')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Radio
                          checked={param.isSmallPeak}
                          onChange={() => handleFieldToggle(param.id, 'isSmallPeak')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Radio
                          checked={param.isProduct}
                          onChange={() => handleFieldToggle(param.id, 'isProduct')}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          placeholder="1.0"
                          value={param.wiggle}
                          onChange={(e) =>
                            handleWiggleChange(param.id, e.target.value)
                          }
                          onBlur={() => handleWiggleBlur(param.id)}
                          variant="outlined"
                          type="text"
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Remove parameter">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveParameter(param.id)}
                              disabled={parameters.length === 1}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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

