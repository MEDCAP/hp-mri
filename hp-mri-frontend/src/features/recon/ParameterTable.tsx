import React from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  HelpOutline as HelpIcon,
  Science as ReferenceIcon
} from '@mui/icons-material';
import { Parameter } from './pipeline';
import { PEAK_NAME_HINT, isValidPeakName } from './reconstructValidation';

interface ParameterTableProps {
  parameters: Parameter[];
  onAdd: () => void;
  onLoadReference: () => void;
  onNameChange: (id: string, value: string) => void;
  onValueChange: (id: string, value: string) => void;
  onValueBlur: (id: string) => void;
  onFieldToggle: (id: string, field: 'isSource' | 'isSmallPeak' | 'isProduct') => void;
  onRemove: (id: string) => void;
}

const ParameterTable: React.FC<ParameterTableProps> = ({
  parameters,
  onAdd,
  onLoadReference,
  onNameChange,
  onValueChange,
  onValueBlur,
  onFieldToggle,
  onRemove,
}) => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          Metabolite Peaks
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ReferenceIcon />}
            onClick={onLoadReference}
          >
            Load reference peaks
          </Button>
          <Tooltip title="Add peak">
            <IconButton color="primary" onClick={onAdd} size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Metabolite Name
                  <Tooltip title={PEAK_NAME_HINT} placement="top">
                    <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </Box>
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
                  <Tooltip title="Check if this metabolite is one of the small peaks to fit to" placement="top">
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
              <TableCell align="center" sx={{ width: 50 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parameters.map((param) => {
              const nameError = param.name.trim() !== '' && !isValidPeakName(param.name.trim());
              return (
                <TableRow key={param.id}>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="e.g., pyr, lac"
                      value={param.name}
                      onChange={(e) => onNameChange(param.id, e.target.value)}
                      error={nameError}
                      helperText={nameError ? 'Letters and digits only, no underscore' : ''}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="0.00"
                      value={param.value}
                      onChange={(e) => onValueChange(param.id, e.target.value)}
                      onBlur={() => onValueBlur(param.id)}
                      variant="outlined"
                      type="text"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={param.isSource}
                      onChange={() => onFieldToggle(param.id, 'isSource')}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={param.isSmallPeak}
                      onChange={() => onFieldToggle(param.id, 'isSmallPeak')}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={param.isProduct}
                      onChange={() => onFieldToggle(param.id, 'isProduct')}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Remove peak">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onRemove(param.id)}
                          disabled={parameters.length === 1}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ParameterTable;
