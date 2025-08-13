/**
 * @fileoverview ControlPanel.tsx: Dual-mode UI for HP-MRI Visualization (Spectral + Imaging).
 *
 * @version 2.0.2
 * @author Ben Yoon
 * @date 2025-03-04
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { Slider } from '@mui/material';

interface ControlProps {
    onSliderChange: (value: number, contrast: number) => void;
    onDatasetChange: (value: number) => void;
    datasetIndex: number;
    numDatasets: number;
    numSliderValues?: number;
    imageSlice: number;
    contrast: number;
    setImageSlice: (value: number) => void;
    openDrawer: boolean;
}

const ControlPanel: React.FC<ControlProps> = ({
    onSliderChange,
    onDatasetChange,
    datasetIndex,
    numDatasets,
    numSliderValues = 1,
    imageSlice,
    contrast,
    setImageSlice,
    openDrawer,
}) => {

    const handleImageSliceChange = (_event: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setImageSlice(value);
        onSliderChange(value, contrast);
    };

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box className="slice-contrast-container">
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 590,
                        zIndex: 2,
                    }}
                >
                    <Typography
                        align="center"
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            mb: 1,
                        }}
                    >
                        Proton Slice: {imageSlice}
                    </Typography>
                    <Slider
                        className="control-slider"
                        value={imageSlice}
                        min={1}
                        max={numSliderValues}
                        onChange={handleImageSliceChange}
                        aria-labelledby="image-slice-slider"
                        sx={{
                            color: 'white',
                            '& .MuiSlider-thumb': {
                                backgroundColor: '#ffffff',
                            },
                            '& .MuiSlider-track': {
                                backgroundColor: '#ffffff',
                            },
                            '& .MuiSlider-rail': {
                                backgroundColor: '#888888',
                            },
                            '& .MuiSlider-markLabel': {
                                color: 'white',
                                fontWeight: 'bold',
                            },
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default ControlPanel;
