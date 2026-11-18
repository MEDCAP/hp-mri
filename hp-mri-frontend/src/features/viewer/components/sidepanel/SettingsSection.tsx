import React from 'react';
import { Typography, Select, MenuItem, Switch, FormControlLabel, Slider, Divider, SelectChangeEvent } from '@mui/material';

interface SettingsSectionProps {
  toggleHpMriData: () => void;
  threshold: number;
  onThresholdChange: (event: Event, value: number | number[]) => void;
  scaleByIntensity: boolean;
  onToggleScaleByIntensity: () => void;
  colorScale: 'Hot' | 'Jet' | 'B&W';
  onColorScaleChange: (value: 'Hot' | 'Jet' | 'B&W') => void;
  onMagnetTypeChange: (event: SelectChangeEvent) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  toggleHpMriData,
  threshold,
  onThresholdChange,
  scaleByIntensity,
  onToggleScaleByIntensity,
  colorScale,
  onColorScaleChange,
  onMagnetTypeChange,
}) => {
  return (
    <>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Settings
      </Typography>

      <FormControlLabel
        control={
          <Switch
            onChange={toggleHpMriData}
            color="primary"
            sx={{
              '& .MuiSwitch-switchBase': {
                color: 'white',
              },
              '& .Mui-checked': {
                color: '#00c7be',
              },
              '& .Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#00c7be',
              },
            }}
          />
        }
        label="Show HP-MRI Data"
        sx={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          '& .MuiFormControlLabel-label': {
            color: 'white',
            fontWeight: 'bold',
          },
        }}
      />

      <Divider sx={{ my: 2, background: 'white' }} />

      <Typography
        variant="body1"
        sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
      >
        Threshold</Typography>
      <Slider value={threshold} min={0} max={1} step={0.1} onChange={onThresholdChange} sx={{
        color: 'white',
        '& .MuiSlider-thumb': { backgroundColor: 'white' },
        '& .MuiSlider-track': { backgroundColor: 'white' },
        '& .MuiSlider-rail': { backgroundColor: '#555' },
      }} />
      <>
        <Divider sx={{ my: 2, background: 'white' }} />
        <FormControlLabel
          control={
            <Switch
              checked={scaleByIntensity}
              onChange={onToggleScaleByIntensity}
              color="primary"
              sx={{
                '& .MuiSwitch-switchBase': {
                  color: 'white',
                },
                '& .Mui-checked': {
                  color: '#00c7be',
                },
                '& .Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00c7be',
                },
              }}
            />
          }
          label="Scale by Intensity"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            '& .MuiFormControlLabel-label': {
              color: 'white',
              fontWeight: 'bold',
            },
          }}
        />

        <Typography
          variant="body1"
          sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
        >
          Heatmap Color Scale</Typography>
        <Select
          value={colorScale}
          onChange={(e) => onColorScaleChange(e.target.value as 'Hot' | 'Jet' | 'B&W')}
          fullWidth
          size='small'
          sx={{
            mt: 1.5,
            mb: 2,
            fontSize: '0.85rem',
            color: 'white',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: 'white',
            },
            '& .MuiSvgIcon-root': {
              color: 'white',
            },
          }}
        >
          <MenuItem value="Hot">Hot</MenuItem>
          <MenuItem value="Jet">Jet</MenuItem>
          <MenuItem value="B&W">Black & White</MenuItem>
        </Select>
      </>

      <Divider sx={{ my: 2, background: 'white' }} />
      <Typography variant="h6" color='white'>Magnet Type</Typography>
      <Select defaultValue="HUPC" onChange={onMagnetTypeChange} size='small' sx={{
        mt: 1.5,
        mb: 2,
        fontSize: '0.85rem',
        color: 'white',
        '.MuiOutlinedInput-notchedOutline': {
          borderColor: 'white',
        },
        '& .MuiSvgIcon-root': {
          color: 'white',
        },
      }}>
        <MenuItem value="HUPC">HUPC</MenuItem>
        <MenuItem value="Clinical">Clinical</MenuItem>
        <MenuItem value="MR Solutions">MR Solutions</MenuItem>
      </Select>
    </>
  );
};

export default SettingsSection;
