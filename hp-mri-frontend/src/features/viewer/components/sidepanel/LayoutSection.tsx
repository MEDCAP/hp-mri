import React from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { MAX_COLS } from '../../hooks/useViewerState';

interface LayoutSectionProps {
  cols: number;
  rows: number;
  onLayoutChange: (cols: number, rows: number) => void;
}

const toggleStyles = {
  flex: 1,
  color: '#bbb',
  borderColor: '#555',
  '&.Mui-selected': {
    backgroundColor: 'rgba(25, 118, 210, 0.8)',
    color: '#fff',
    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.9)' },
  },
  '&.Mui-disabled': { color: '#555', borderColor: '#3a3a3a' },
};

/**
 * Picks the panel grid. Lives in the side panel drawer, which is a fixed
 * overlay, so the control costs the grid itself no height.
 */
const LayoutSection: React.FC<LayoutSectionProps> = ({ cols, rows, onLayoutChange }) => {
  // A third row only fits in the single-column layout.
  const rowsDisabledAbove = cols > 1 ? 2 : 3;

  return (
    <>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Layout
      </Typography>

      <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
        Columns
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={cols}
        onChange={(_e, value: number | null) => value && onLayoutChange(value, rows)}
      >
        {Array.from({ length: MAX_COLS }, (_, i) => i + 1).map(value => (
          <ToggleButton key={value} value={value} sx={toggleStyles}>{value}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="body1" sx={{ color: 'white', fontWeight: 'bold', mt: 3, mb: 1 }}>
        Rows
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={rows}
        onChange={(_e, value: number | null) => value && onLayoutChange(cols, value)}
      >
        {[1, 2, 3].map(value => (
          <Tooltip
            key={value}
            title={value > rowsDisabledAbove ? '3 rows requires 1 column' : ''}
            placement="top"
          >
            {/* span keeps the tooltip working over a disabled button */}
            <span style={{ flex: 1, display: 'flex' }}>
              <ToggleButton
                value={value}
                disabled={value > rowsDisabledAbove}
                sx={toggleStyles}
              >
                {value}
              </ToggleButton>
            </span>
          </Tooltip>
        ))}
      </ToggleButtonGroup>

      {/* Preview of the resulting grid */}
      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 0.5,
          height: 90,
        }}
      >
        {Array.from({ length: cols * rows }, (_, i) => (
          <Box key={i} sx={{ border: '1px solid #777', borderRadius: 1, backgroundColor: '#1e1e1e' }} />
        ))}
      </Box>
      <Typography variant="caption" sx={{ color: '#bbb', display: 'block', mt: 1 }}>
        {cols * rows} of 6 panels
      </Typography>
    </>
  );
};

export default LayoutSection;
