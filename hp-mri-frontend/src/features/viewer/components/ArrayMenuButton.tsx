import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ArrowDropDown } from '@mui/icons-material';
import { MrdArrayDescriptor } from '../../../api/types';

interface ArrayMenuButtonProps {
  arrays: MrdArrayDescriptor[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

/** Picks which named array of the panel's MRD file the panel displays. */
const ArrayMenuButton: React.FC<ArrayMenuButtonProps> = ({
  arrays,
  loading,
  selectedKey,
  onSelect,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const selected = arrays.find(array => array.key === selectedKey);
  const label = loading ? 'Loading arrays…' : selected?.name ?? 'Select array';

  const handleSelect = (key: string) => {
    setAnchorEl(null);
    if (key !== selectedKey) onSelect(key);
  };

  return (
    <>
      <Tooltip title={selected?.name ?? 'Choose which array to display'} placement="bottom" arrow>
        {/* span keeps the tooltip alive while the button is disabled */}
        <span>
          <Button
            size="small"
            disabled={loading || arrays.length === 0}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            endIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : <ArrowDropDown />}
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
              {label}
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
        {arrays.map(array => (
          <MenuItem
            key={array.key}
            selected={array.key === selectedKey}
            onClick={() => handleSelect(array.key)}
            sx={{
              color: '#fff',
              display: 'block',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              '&.Mui-selected': { backgroundColor: 'rgba(25, 118, 210, 0.3)' },
            }}
          >
            <Typography variant="body2">{array.name}</Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              {array.kind} · {array.shape.join('×')}
              {array.transform === 'magnitude' ? ' · magnitude' : ''}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ArrayMenuButton;
