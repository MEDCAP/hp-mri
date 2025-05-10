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
// import { SelectChangeEvent } from '@mui/material';

interface ControlProps {
    mode: 'spectral' | 'imaging';
    onSliderChange: (value: number, contrast: number) => void;
    onDatasetChange: (value: number) => void;
    datasetIndex: number;
    numDatasets: number;
    numSliderValues?: number;
    imageSlice: number;
    contrast: number;
    setImageSlice: (value: number) => void;
    setContrast: (value: number) => void;
    openDrawer: boolean;
}

const ControlPanel: React.FC<ControlProps> = ({
    // mode,
    onSliderChange,
    onDatasetChange,
    datasetIndex,
    numDatasets,
    numSliderValues = 1,
    imageSlice,
    contrast,
    setImageSlice,
    // setContrast,
    openDrawer,
}) => {

    const handleImageSliceChange = (_event: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setImageSlice(value);
        onSliderChange(value, contrast);
    };

    // const handleDatasetChange = (event: SelectChangeEvent<number>) => {
    //     const value = Number(event.target.value);
    //     onDatasetChange(value);
    // };

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
                sx={{
                    position: 'absolute',
                    top: 565,
                    left: openDrawer ? 260 : 100,
                    width: 140,
                    height: 160,
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
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && datasetIndex > 1) {
                        onDatasetChange(datasetIndex - 1);
                    } else if (e.key === 'ArrowDown' && datasetIndex < numDatasets) {
                        onDatasetChange(datasetIndex + 1);
                    }
                }}
            >
                <Typography align="center" sx={{ mb: 1, fontSize: 14, color: 'white' }}>
                    Dataset
                </Typography>
                {Array.from({ length: numDatasets }, (_, i) => {
                    const value = i + 1;
                    return (
                        <Box
                            key={value}
                            onClick={() => onDatasetChange(value)}
                            sx={{
                                paddingY: 0.5,
                                paddingX: 1,
                                cursor: 'pointer',
                                fontSize: 13,
                                backgroundColor: datasetIndex === value ? '#1976d2' : 'transparent',
                                color: datasetIndex === value ? '#fff' : '#ddd',  // inactive entries slightly lighter
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: datasetIndex === value ? '#1565c0' : '#2e2e2e', // hover for dark mode
                                },
                            }}
                        >
                            {value}
                        </Box>
                    );
                })}
            </Box>


            <Box className="slice-contrast-container">
                <Box
                    sx={{
                        position: 'absolute',
                        top: -48,
                        left: openDrawer ? 0 : -30,
                        width: 590,
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
