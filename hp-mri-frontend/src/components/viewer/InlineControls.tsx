import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Slider,
  OutlinedInput,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

interface InlineControlsProps {
  channelIndex: number[];
  sliceIndex: number;
  metaboliteIndex: number;
  measurementIndex: number;
  nmrLabels: string[];
  setChannelIndex: (value: number[]) => void;
  setSliceIndex: (value: number) => void;
  setMetaboliteIndex: (value: number) => void;
  setMeasurementIndex: (value: number) => void;
  maxChannels: number;
  maxSlices: number;
  maxMetabolites: number;
  maxMeasurements: number;
}

const InlineControls: React.FC<InlineControlsProps> = ({
  channelIndex,
  sliceIndex,
  metaboliteIndex,
  measurementIndex,
  nmrLabels,
  setChannelIndex,
  setSliceIndex,
  setMetaboliteIndex,
  setMeasurementIndex,
  maxChannels,
  maxSlices,
  maxMetabolites,
  maxMeasurements
}) => {
  // Optimized slider handlers to prevent re-renders during dragging
  const handleSliceChange = useCallback((_e: Event, value: number | number[]) => {
    const newValue = value as number;
    setSliceIndex(newValue);
  }, [setSliceIndex]);

  const handleMeasurementChange = useCallback((_e: Event, value: number | number[]) => {
    const newValue = value as number;
    setMeasurementIndex(newValue);
  }, [setMeasurementIndex]);

  const handleSliceInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue) || newValue < 0 || newValue >= maxSlices) return;
    setSliceIndex(newValue);
  }, [setSliceIndex, maxSlices]);

  const handleMeasurementInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    if (isNaN(newValue) || newValue < 0 || newValue >= maxMeasurements) return;
    setMeasurementIndex(newValue);
  }, [setMeasurementIndex, maxMeasurements]);

  const metaboliteOptions = (nmrLabels && nmrLabels.length > 0)
    ? nmrLabels.map((label, idx) => ({ label, idx }))
    : Array.from({ length: Math.max(0, maxMetabolites + 1) }, (_, idx) => ({ label: `Metabolite ${idx}`, idx }));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0.25,
      p: 1,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderTop: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '0 0 8px 8px'
    }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      
      {/* Channel Selection */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#ddd', fontWeight: 500, minWidth: 75 }}>Channels</Typography>
        <ToggleButtonGroup
          value={channelIndex}
          onChange={(_e, newValue: number[]) => setChannelIndex(Array.isArray(newValue) ? newValue : [])}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#bbb',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              px: 1.5,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff'
              },
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.8)',
                color: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.9)'
                }
              }
            }
          }}
        >
          {Array.from({ length: Math.max(0, maxChannels + 1) }, (_, i) => (
            <ToggleButton key={i} value={i}>{i}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Metabolite Selection */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: -2 }}>
        <Typography variant="caption" sx={{ color: '#ddd', fontWeight: 500, minWidth: 75 }}>Metabolite</Typography>
        <TextField
          select
          size="small"
          value={metaboliteIndex}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMetaboliteIndex(Number(e.target.value))}
          sx={{
            width: 200,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              height: 32,
              '& fieldset': {
                border: 'none'
              },
              '&:hover fieldset': {
                border: '1px solid rgba(255,255,255,0.3)'
              },
              '&.Mui-focused fieldset': {
                border: '1px solid rgba(25, 118, 210, 0.8)'
              }
            },
            '& .MuiSelect-select': {
              color: '#fff',
              fontSize: '0.75rem',
              padding: '6px 12px'
            },
            '& .MuiSvgIcon-root': {
              color: '#bbb'
            }
          }}
          SelectProps={{
            MenuProps: {
              PaperProps: {
                sx: {
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '& .MuiMenuItem-root': {
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.3)'
                    }
                  }
                }
              }
            }
          }}
        >
          {metaboliteOptions.map((option) => (
            <MenuItem key={option.idx} value={option.idx}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Slice Control */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: -0.5 }}>
        <Typography variant="caption" sx={{ color: '#ddd', fontWeight: 500, minWidth: 75 }}>Slice</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Slider
            value={sliceIndex}
            min={0}
            max={Math.max(0, maxSlices)}
            step={1}
            onChange={handleSliceChange}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{ 
              color: '#90caf9',
              '& .MuiSlider-track': {
                backgroundColor: '#90caf9'
              },
              '& .MuiSlider-thumb': {
                backgroundColor: '#90caf9',
                border: '2px solid #fff',
                '&:hover': {
                  boxShadow: '0 0 0 8px rgba(144, 202, 249, 0.16)'
                }
              },
              '& .MuiSlider-rail': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          />
          <OutlinedInput
            size="small"
            value={sliceIndex}
            onChange={handleSliceInputChange}
            sx={{
              width: 60,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              '& fieldset': { border: 'none' },
              '& input': { 
                color: '#fff', 
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '4px 8px'
              }
            }}
          />
          <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>
            / {maxSlices}
          </Typography>
        </Box>
      </Box>

      {/* Measurement Control */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="caption" sx={{ color: '#ddd', fontWeight: 500, minWidth: 75 }}>Measurement</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Slider
            value={measurementIndex}
            min={0}
            max={Math.max(0, maxMeasurements)}
            step={1}
            onChange={handleMeasurementChange}
            onMouseDown={(e) => e.stopPropagation()}
            sx={{ 
              color: '#ffb74d',
              '& .MuiSlider-track': {
                backgroundColor: '#ffb74d'
              },
              '& .MuiSlider-thumb': {
                backgroundColor: '#ffb74d',
                border: '2px solid #fff',
                '&:hover': {
                  boxShadow: '0 0 0 8px rgba(255, 183, 77, 0.16)'
                }
              },
              '& .MuiSlider-rail': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          />
          <OutlinedInput
            size="small"
            value={measurementIndex}
            onChange={handleMeasurementInputChange}
            sx={{
              width: 60,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              '& fieldset': { border: 'none' },
              '& input': { 
                color: '#fff', 
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '4px 8px'
              }
            }}
          />
          <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>
            / {maxMeasurements}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default InlineControls;
