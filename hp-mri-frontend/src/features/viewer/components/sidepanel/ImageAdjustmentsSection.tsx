import React from 'react';
import { Typography, Slider, Divider } from '@mui/material';

interface ImageAdjustmentsSectionProps {
  contrast: number;
  setContrast: (v: number) => void;
  onContrastChange: (value: number, contrast: number) => void;
  imageSlice: number;
  alpha: number;
  onAlphaChange: (v: number) => void;
}

const ImageAdjustmentsSection: React.FC<ImageAdjustmentsSectionProps> = ({
  contrast,
  setContrast,
  onContrastChange,
  imageSlice,
  alpha,
  onAlphaChange,
}) => {
  return (
    <>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Image Adjustments
      </Typography>

      <Typography
        variant="body1"
        sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
      >
        Contrast
      </Typography>
      <Slider
        value={contrast}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={(_e, val) => setContrast(val as number)}
        onChangeCommitted={(_e, val) => onContrastChange(imageSlice, val as number)}
        sx={{
          color: 'white',
          '& .MuiSlider-thumb': { backgroundColor: 'white' },
          '& .MuiSlider-track': { backgroundColor: 'white' },
          '& .MuiSlider-rail': { backgroundColor: '#555' },
        }}
      />
      {/* Contrast alpha slider */}
      <>
        <Divider sx={{ my: 2, background: 'white' }} />

        <Typography
          variant="body1"
          sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}
        >
          Alpha: {alpha.toFixed(2)}</Typography>
        <Slider
          value={alpha}
          min={0.0}
          max={1.0}
          step={0.05}
          onChange={(_e, newValue) => onAlphaChange(newValue as number)}
          sx={{
            color: 'white',
            '& .MuiSlider-thumb': { backgroundColor: 'white' },
            '& .MuiSlider-track': { backgroundColor: 'white' },
            '& .MuiSlider-rail': { backgroundColor: '#555' },
          }}
        />
      </>
    </>
  );
};

export default ImageAdjustmentsSection;
