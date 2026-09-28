import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  Delete as DeleteIcon,
  SouthOutlined as FlowIcon
} from '@mui/icons-material';
import ParameterTable from './ParameterTable';
import {
  STAGE_DESCRIPTIONS,
  STAGE_LABELS,
  STAGE_ORDER,
  StageForm,
  StageId,
  TUNABLE_SPECS,
  TunableKey
} from './pipeline';
import { isValidTunableInput } from './reconstructValidation';

interface PipelineBuilderProps {
  stages: StageForm[];
  onAddStage: (id: StageId) => void;
  onRemoveStage: (id: StageId) => void;
  onMoveStage: (index: number, direction: -1 | 1) => void;
  onAddPeak: () => void;
  onLoadReferencePeaks: () => void;
  onPeakNameChange: (id: string, value: string) => void;
  onPeakValueChange: (id: string, value: string) => void;
  onPeakValueBlur: (id: string) => void;
  onPeakFieldToggle: (id: string, field: 'isSource' | 'isSmallPeak' | 'isProduct') => void;
  onRemovePeak: (id: string) => void;
  onTunableChange: (key: TunableKey, value: string) => void;
}

const FlowMarker: React.FC<{ label: string }> = ({ label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1, color: 'text.secondary' }}>
    <FlowIcon fontSize="small" />
    <Typography variant="caption" fontWeight="medium">
      {label}
    </Typography>
  </Box>
);

const PipelineBuilder: React.FC<PipelineBuilderProps> = ({
  stages,
  onAddStage,
  onRemoveStage,
  onMoveStage,
  onAddPeak,
  onLoadReferencePeaks,
  onPeakNameChange,
  onPeakValueChange,
  onPeakValueBlur,
  onPeakFieldToggle,
  onRemovePeak,
  onTunableChange,
}) => {
  const theme = useTheme();
  const missingStages = STAGE_ORDER.filter((id) => !stages.some((stage) => stage.id === id));

  return (
    <Box>
      <Typography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
        Pipeline
      </Typography>

      <FlowMarker label="Raw file" />

      {stages.map((stage, index) => (
        <Paper key={stage.id} variant="outlined" sx={{ p: 2, mb: 1, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={index + 1} size="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                {STAGE_LABELS[stage.id]}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Move earlier">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onMoveStage(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move later">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onMoveStage(index, 1)}
                    disabled={index === stages.length - 1}
                  >
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Remove stage">
                <IconButton size="small" color="error" onClick={() => onRemoveStage(stage.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Typography variant="body2" color="textSecondary" sx={{ mb: stage.id === 'recon' ? 2 : 0 }}>
            {STAGE_DESCRIPTIONS[stage.id]}
          </Typography>

          {stage.id === 'recon' && (
            <>
              <ParameterTable
                parameters={stage.peaks}
                onAdd={onAddPeak}
                onLoadReference={onLoadReferencePeaks}
                onNameChange={onPeakNameChange}
                onValueChange={onPeakValueChange}
                onValueBlur={onPeakValueBlur}
                onFieldToggle={onPeakFieldToggle}
                onRemove={onRemovePeak}
              />

              <Typography variant="subtitle1" fontWeight="medium" sx={{ mt: 3, mb: 1 }}>
                Fit tunables
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Optional. Leave blank to use the reconstruction container's own defaults.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {TUNABLE_SPECS.map(({ key, label, help }) => (
                  <Tooltip key={key} title={help} placement="top">
                    <TextField
                      size="small"
                      label={label}
                      placeholder="default"
                      value={stage.tunables[key]}
                      onChange={(e) => {
                        if (isValidTunableInput(e.target.value)) onTunableChange(key, e.target.value);
                      }}
                      sx={{ width: 180 }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </>
          )}
        </Paper>
      ))}

      <FlowMarker label="Reconstructed output file" />

      {missingStages.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {missingStages.map((id) => (
            <Button
              key={id}
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => onAddStage(id)}
              sx={{ borderStyle: 'dashed', color: theme.palette.text.secondary }}
            >
              {STAGE_LABELS[id]}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PipelineBuilder;
