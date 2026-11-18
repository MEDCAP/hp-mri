import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import { Merge as MergeIcon, CloudDownload as LoadIcon } from '@mui/icons-material';
import { MRDFile } from '../../../../types/mrd';
import { ConcatenationResult } from '../../concatenate';

interface ConcatenationSectionProps {
  availableFiles: MRDFile[];
  selectedFiles: MRDFile[];
  result: ConcatenationResult | null;
  loading: boolean;
  error: string | null;
  onSelectionChange: (files: MRDFile[]) => void;
  onConcatenate: () => void;
  onLoadToWindow: (index: number) => void;
  panelCount: number;
}

const outlinedButton = {
  color: 'white',
  borderColor: '#777',
  '&:hover': { borderColor: 'white' },
  '&.Mui-disabled': { color: '#777', borderColor: '#555' },
};

/**
 * Joins the first image array of several files along the measurement axis,
 * then loads the result into a panel.
 */
const ConcatenationSection: React.FC<ConcatenationSectionProps> = ({
  availableFiles,
  selectedFiles,
  result,
  loading,
  error,
  onSelectionChange,
  onConcatenate,
  onLoadToWindow,
  panelCount,
}) => {
  const isSelected = (file: MRDFile) => selectedFiles.some(f => f._id === file._id);

  const toggle = (file: MRDFile) => {
    onSelectionChange(isSelected(file)
      ? selectedFiles.filter(f => f._id !== file._id)
      : [...selectedFiles, file]);
  };

  const allSelected = availableFiles.length > 0 && selectedFiles.length === availableFiles.length;

  return (
    <>
      <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
        Concatenation
      </Typography>
      <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
        Joins each file's first image array along the measurement axis. All files must
        have the same channels, slices, rows, columns and frequencies.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', flexGrow: 1 }}>
          {selectedFiles.length} of {availableFiles.length} selected
        </Typography>
        <Button
          size="small"
          sx={{ color: 'white' }}
          onClick={() => onSelectionChange(allSelected ? [] : [...availableFiles])}
          disabled={availableFiles.length === 0}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </Button>
      </Box>

      <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid #555', borderRadius: 1, mb: 2 }}>
        <List dense disablePadding>
          {availableFiles.map(file => (
            <ListItemButton key={file._id} onClick={() => toggle(file)} sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isSelected(file)}
                  tabIndex={-1}
                  disableRipple
                  sx={{ color: '#bbb', '&.Mui-checked': { color: 'white' } }}
                />
              </ListItemIcon>
              <ListItemText
                primary={file.fileName}
                secondary={`${file.subjectType} • ${file.studyDate}`}
                primaryTypographyProps={{ sx: { color: 'white', fontSize: '0.8rem' } }}
                secondaryTypographyProps={{ sx: { color: '#999', fontSize: '0.7rem' } }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        fullWidth
        variant="contained"
        startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <MergeIcon />}
        onClick={onConcatenate}
        disabled={selectedFiles.length < 2 || loading}
        sx={{ backgroundColor: '#000c3f', fontWeight: 'bold', '&.Mui-disabled': { color: '#999' } }}
      >
        {loading ? 'Concatenating…' : `Concatenate ${selectedFiles.length} files`}
      </Button>

      {result && (
        <>
          <Divider sx={{ my: 2, borderColor: '#555' }} />
          <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
            Result
          </Typography>
          <Typography variant="body2" sx={{ color: '#ddd' }}>
            Shape: [{result.shape.join(', ')}]
          </Typography>
          <Typography variant="body2" sx={{ color: '#ddd' }}>
            Measurements: {result.totalMeasurements}
          </Typography>
          <Typography variant="body2" sx={{ color: '#ddd', mb: 1 }}>
            Labels: {result.labels.length}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {result.sourceFiles.map(name => (
              <Chip key={name} label={name} size="small" variant="outlined" sx={{ color: 'white', borderColor: '#777' }} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Array.from({ length: panelCount }, (_, i) => (
              <Tooltip key={i} title={`Load the result into Window ${i + 1}`}>
                <Button variant="outlined" size="small" startIcon={<LoadIcon />} onClick={() => onLoadToWindow(i)} sx={outlinedButton}>
                  {`Window ${i + 1}`}
                </Button>
              </Tooltip>
            ))}
          </Box>
        </>
      )}
    </>
  );
};

export default ConcatenationSection;
