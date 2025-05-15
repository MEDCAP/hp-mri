// src/components/visualize/PlotShiftPanel.tsx
import React, { useState } from 'react';
import { Box, IconButton, Tooltip, TextField, Typography } from '@mui/material';
import { ArrowUpward, ArrowDownward, ArrowBack, ArrowForward, RestartAlt } from '@mui/icons-material';

interface Props {
    onMoveUp: () => void;
    onMoveDown: () => void;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onReset: () => void;
    mode: 'spectral' | 'imaging';
    metabolite: number;
    onMetaboliteChange: (val: number) => void;
}

const PlotShiftPanel: React.FC<Props> = ({
    onMoveUp,
    onMoveDown,
    onMoveLeft,
    onMoveRight,
    onReset,
    mode,
    metabolite,
    onMetaboliteChange,
}) => {
    const [metaboliteIndex, setMetaboliteIndex] = useState(metabolite);
    const [metaboliteNames, setMetaboliteNames] = useState(['0', '1', '2']);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
            {mode === 'imaging' && (
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -150,
                            left: 0,
                            width: 150,
                            height: 140,
                            overflowY: 'auto',
                            border: '1px solid #333',  // darker subtle border
                            borderRadius: 2,
                            backgroundColor: '#1e1e1e',  // match PlotShiftPanel
                            color: 'white',              // white text
                            padding: 1,
                            zIndex: 5,
                            boxShadow: 4,                // same boxShadow
                        }}
                        tabIndex={0}
                    >
                        <Typography align="center" sx={{ mb: 1, fontSize: 14, color: 'white' }}>
                            Metabolite
                        </Typography>
                        {metaboliteNames.map((name, i) => (
                            <Box
                                key={i}
                                onClick={() => { onMetaboliteChange(i); setMetaboliteIndex(i); }}
                                onDoubleClick={() => setEditingIndex(i)}
                                sx={{
                                    paddingY: 0.5,
                                    paddingX: 1,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    backgroundColor: metaboliteIndex === i ? '#1976d2' : 'transparent',
                                    color: metaboliteIndex === i ? '#fff' : '#ddd',
                                    borderRadius: 1,
                                    '&:hover': {
                                        backgroundColor: metaboliteIndex === i ? '#1565c0' : '#2e2e2e',
                                    },
                                }}
                            >
                                {editingIndex === i ? (
                                    <TextField
                                        autoFocus
                                        variant="standard"
                                        value={name}
                                        onChange={(e) => {
                                            const updated = [...metaboliteNames];
                                            updated[i] = e.target.value;
                                            setMetaboliteNames(updated);
                                        }}
                                        onBlur={() => setEditingIndex(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setEditingIndex(null);
                                        }}
                                        InputProps={{
                                            disableUnderline: true,
                                            style: {
                                                fontSize: 13,
                                                color: 'white',
                                                padding: 0,
                                            },
                                        }}
                                        sx={{
                                            input: {
                                                padding: 0,
                                                color: 'black',
                                                backgroundColor: 'transparent',
                                                textAlign: 'center',
                                            },
                                        }}
                                    />
                                ) : (
                                    name
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

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
