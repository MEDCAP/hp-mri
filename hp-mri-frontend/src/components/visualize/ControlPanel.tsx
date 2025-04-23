/**
 * @fileoverview ControlPanel.tsx: Dual-mode UI for HP-MRI Visualization (Spectral + Imaging).
 *
 * @version 2.0.1
 * @author Ben Yoon
 * @date 2025-03-04
 */

import React, { useState, useEffect } from 'react';
import { Box, Slider, Typography } from '@mui/material';

interface ControlProps {
    mode: 'spectral' | 'imaging';
    onSliderChange: (value: number, contrast: number) => void;
    onContrastChange: (value: number, contrast: number) => void;
    onDatasetChange: (value: number) => void;
    datasetIndex: number;
    numDatasets: number;
    numSliderValues?: number; // Only used in spectral mode
}

const ControlPanel: React.FC<ControlProps> = ({
    mode,
    onSliderChange,
    onContrastChange,
    onDatasetChange,
    datasetIndex,
    numDatasets,
    numSliderValues = 1,
}) => {
    const [imageSlice, setImageSlice] = useState(1);
    const [contrast, setContrast] = useState(1);

    useEffect(() => {
        setImageSlice(1);
        setContrast(1);
    }, [mode]);

    const handleImageSliceChange = (_event: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setImageSlice(value);
        onSliderChange(value, contrast);
    };

    const handleContrastChange = (_event: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setContrast(value);
        onContrastChange(imageSlice, value);
    };

    const handleDatasetChange = (_event: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        onDatasetChange(value);
    };

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Dataset Slider */}
            <Box className="dataset-slider-container">
                <Typography align="center">Dataset: {datasetIndex}</Typography>
                <Slider
                    className="control-slider"
                    value={datasetIndex}
                    min={1}
                    max={numDatasets}
                    step={1}
                    onChange={handleDatasetChange}
                    aria-labelledby="dataset-slider"
                />
            </Box>

            <Box className="slice-contrast-container">
                <Box>
                    <Typography align="center">Proton Slice: {imageSlice}</Typography>
                    <Slider
                        className="control-slider"
                        value={imageSlice}
                        min={1}
                        max={numSliderValues}
                        onChange={handleImageSliceChange}
                        aria-labelledby="image-slice-slider"
                    />
                </Box>

                <Box>
                    <Typography align="center">Contrast: {contrast.toFixed(1)}</Typography>
                    <Slider
                        className="control-slider"
                        value={contrast}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        onChange={handleContrastChange}
                        aria-labelledby="contrast-slider"
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default ControlPanel;
