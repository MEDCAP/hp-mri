import React from 'react';
import {
  Box,
  Typography,
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';

export interface Parameter {
  id: string;
  name: string;            // name of the metabolite
  value: number | string;  // ppm offset of the metabolite (frequency offset)
  isSource: boolean;       // flag if the metabolite is source of the HP imaging
  isSmallPeak: boolean;    // flag if the metabolite not the tallest peak
  isProduct: boolean;      // flag if the metabolite is the product of the metabolism
  wiggle: number | string; // wiggle factor to allow +-variations of peak ppm from offset
}

interface ParameterTableProps {
  parameters: Parameter[];
  onAdd: () => void;
  onNameChange: (id: string, value: string) => void;
  onValueChange: (id: string, value: string) => void;
  onValueBlur: (id: string) => void;
  onWiggleChange: (id: string, value: string) => void;
  onWiggleBlur: (id: string) => void;
  onFieldToggle: (id: string, field: 'isSource' | 'isSmallPeak' | 'isProduct') => void;
  onRemove: (id: string) => void;
}

const ParameterTable: React.FC<ParameterTableProps> = ({
  parameters,
  onAdd,
  onNameChange,
  onValueChange,
  onValueBlur,
  onWiggleChange,
  onWiggleBlur,
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
        <Typography variant="h6" fontWeight="medium">
          Metabolite Parameters
        </Typography>
        <Tooltip title="Add parameter">
          <IconButton
            color="primary"
            onClick={onAdd}
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
                      onNameChange(param.id, e.target.value)
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
                      onValueChange(param.id, e.target.value)
                    }
                    onBlur={() => onValueBlur(param.id)}
                    variant="outlined"
                    type="text"
                  />
                </TableCell>
                <TableCell align="center">
                  <Radio
                    checked={param.isSource}
                    onChange={() => onFieldToggle(param.id, 'isSource')}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Radio
                    checked={param.isSmallPeak}
                    onChange={() => onFieldToggle(param.id, 'isSmallPeak')}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Radio
                    checked={param.isProduct}
                    onChange={() => onFieldToggle(param.id, 'isProduct')}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <TextField
                    size="small"
                    placeholder="1.0"
                    value={param.wiggle}
                    onChange={(e) =>
                      onWiggleChange(param.id, e.target.value)
                    }
                    onBlur={() => onWiggleBlur(param.id)}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ParameterTable;
