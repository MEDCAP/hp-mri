import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Merge as MergeIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CloudDownload as LoadIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { MRDFile } from '../../types/mrd';
import { ConcatenatedMRDData } from '../../hooks/useMRDArrayConcatenation';

interface ConcatenationPanelProps {
  availableFiles: MRDFile[];
  selectedFiles: MRDFile[];
  concatenatedData: ConcatenatedMRDData | null;
  loading: boolean;
  error: string | null;
  onFileSelectionChange: (files: MRDFile[]) => void;
  onPerformConcatenation: () => void;
  onLoadToWindow: (windowIndex: number) => void;
  panelCount: number;
}

const ConcatenationPanel: React.FC<ConcatenationPanelProps> = ({
  availableFiles,
  selectedFiles,
  concatenatedData,
  loading,
  error,
  onFileSelectionChange,
  onPerformConcatenation,
  onLoadToWindow,
  panelCount
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleFileToggle = (file: MRDFile) => {
    const currentIndex = selectedFiles.findIndex(f => f._id === file._id);
    const newSelectedFiles = [...selectedFiles];

    if (currentIndex === -1) {
      newSelectedFiles.push(file);
    } else {
      newSelectedFiles.splice(currentIndex, 1);
    }

    onFileSelectionChange(newSelectedFiles);
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === availableFiles.length) {
      onFileSelectionChange([]);
    } else {
      onFileSelectionChange([...availableFiles]);
    }
  };

  const handleClearSelection = () => {
    onFileSelectionChange([]);
  };

  const isFileSelected = (file: MRDFile) => {
    return selectedFiles.some(f => f._id === file._id);
  };

  return (
    <Paper sx={{ p: 2, m: 1, border: '1px solid #e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <MergeIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Array Concatenation Tool
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </Box>

      {expanded && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select multiple MRD files to concatenate their arrays along the measurements dimension.
            All files must have compatible dimensions (channels, slices, rows, cols, frequencies).
          </Typography>

          {/* File Selection Area */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                Select Files ({selectedFiles.length} of {availableFiles.length} selected)
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
                sx={{ mr: 1 }}
              >
                {selectedFiles.length === availableFiles.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                size="small"
                onClick={handleClearSelection}
                disabled={selectedFiles.length === 0}
              >
                Clear
              </Button>
            </Box>

            <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
              <List dense>
                {availableFiles.map((file) => (
                  <ListItem key={file._id} onClick={() => handleFileToggle(file)}>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isFileSelected(file)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemIcon>
                      <FileIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.fileName}
                      secondary={`${file.subjectType} • ${file.studyDate} • ${file.ownerName}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          {/* Selected Files Display */}
          {selectedFiles.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Selected Files:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedFiles.map((file) => (
                  <Chip
                    key={file._id}
                    label={file.fileName}
                    onDelete={() => handleFileToggle(file)}
                    deleteIcon={<DeleteIcon />}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Concatenation Controls */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <MergeIcon />}
              onClick={onPerformConcatenation}
              disabled={selectedFiles.length < 2 || loading}
              fullWidth
            >
              {loading ? 'Concatenating Arrays...' : `Concatenate ${selectedFiles.length} Files`}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Concatenation Results */}
          {concatenatedData && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Concatenation Results
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Source Files:</strong> {concatenatedData.sourceFiles.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Total Measurements:</strong> {concatenatedData.totalMeasurements}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Array Shape:</strong> {concatenatedData.concatenatedImageArray.length > 0 
                      ? `[${concatenatedData.concatenatedImageArray.length}, ${concatenatedData.concatenatedImageArray[0]?.length || 0}, ...]`
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>NMR Labels:</strong> {concatenatedData.combinedNmrLabels.length}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Source files: {concatenatedData.sourceFiles.join(', ')}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Array.from({ length: panelCount }, (_, i) => (
                  <Tooltip key={i} title={`Load concatenated data into Window ${i + 1}`}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LoadIcon />}
                      onClick={() => onLoadToWindow(i)}
                    >
                      {`→ Window ${i + 1}`}
                    </Button>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default ConcatenationPanel; 