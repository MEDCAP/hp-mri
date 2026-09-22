import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';
import { ViewKind } from '../hooks/useViewerState';

const VIEW_LABELS: Record<ViewKind, string> = {
  array: 'Array',
  kspace: 'k-space per switch',
  spectrum: 'Fitted spectrum',
  maps: 'Metabolite maps',
  waveforms: 'Sequence waveforms',
};

const VIEW_HINTS: Record<ViewKind, string> = {
  array: 'One named array of the file',
  kspace: 'Acquisitions folded on the gradient switch',
  spectrum: 'The summed spectrum and the model fitted to it',
  maps: 'Each metabolite across the repetitions',
  waveforms: 'Pulses, gradients and acquisitions against time',
};

interface ViewMenuButtonProps {
  views: ViewKind[];
  selected: ViewKind;
  onSelect: (kind: ViewKind) => void;
}

/** Picks which view of the panel's MRD file the panel displays. */
const ViewMenuButton: React.FC<ViewMenuButtonProps> = ({ views, selected, onSelect }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (kind: ViewKind) => {
    setAnchorEl(null);
    if (kind !== selected) onSelect(kind);
  };

  return (
    <>
      <Tooltip title="Choose which view to display" placement="bottom" arrow>
        {/* span keeps the tooltip alive while the button is disabled */}
        <span>
          <Button
            size="small"
            disabled={views.length < 2}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDown />}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              textTransform: 'none',
              fontSize: '0.7rem',
              maxWidth: 200,
              py: 0.25,
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)' },
              '& .MuiButton-endIcon': { ml: 0.25 },
            }}
          >
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {VIEW_LABELS[selected]}
            </Box>
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(0,0,0,0.92)',
              border: '1px solid rgba(255,255,255,0.2)',
              maxHeight: 360,
            },
          },
        }}
      >
        {views.map(kind => (
          <MenuItem
            key={kind}
            selected={kind === selected}
            onClick={() => handleSelect(kind)}
            sx={{
              color: '#fff',
              display: 'block',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              '&.Mui-selected': { backgroundColor: 'rgba(25, 118, 210, 0.3)' },
            }}
          >
            <Typography variant="body2">{VIEW_LABELS[kind]}</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              {VIEW_HINTS[kind]}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ViewMenuButton;
