// src/components/visualize/PlotShiftPanel.tsx
import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ArrowUpward, ArrowDownward, ArrowBack, ArrowForward, RestartAlt } from '@mui/icons-material';

interface Props {
    onMoveUp: () => void;
    onMoveDown: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onReset: () => void;
}

const PlotShiftPanel: React.FC<Props> = ({
    onMoveUp,
    onMoveDown,
    onMoveLeft,
    onMoveRight,
    onReset,
}) => {
    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                backgroundColor: '#1e1e1e',
                borderRadius: 2,
                boxShadow: 4,
                padding: 2,
                zIndex: 1302,
            }}
        >
            <Box display="flex" justifyContent="center">
                <Tooltip title="Up">
                    <IconButton onClick={onMoveUp} sx={{ color: 'white' }}>
                        <ArrowUpward />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box display="flex" justifyContent="center" mt={0.5}>
                <Tooltip title="Left">
                    <IconButton onClick={onMoveLeft} sx={{ color: 'white' }}>
                        <ArrowBack />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Down">
                    <IconButton onClick={onMoveDown} sx={{ color: 'white' }}>
                        <ArrowDownward />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Right">
                    <IconButton onClick={onMoveRight} sx={{ color: 'white' }}>
                        <ArrowForward />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box display="flex" justifyContent="center" mt={1}>
                <Tooltip title="Reset">
                    <IconButton onClick={onReset} sx={{ color: 'white' }}>
                        <RestartAlt />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

export default PlotShiftPanel;
