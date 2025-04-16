/**
 * @fileoverview ControlPanel.tsx: Improved Material UI layout for HP-MRI sliders.
 *
 * @version 2.1
 * @author Benjamin Yoon
 * @date 2025-03-02
 */

import React, { useState } from 'react';
import { Box, Slider, Typography } from '@mui/material';

interface ControlProps {
    onSliderChange: (value: number, contrast: number) => void;
    numSliderValues: number;
    onContrastChange: (value: number, contrast: number) => void;
    onDatasetChange: (value: number) => void;
    datasetIndex: number;
    numDatasets: number;
}

const ControlPanel: React.FC<ControlProps> = ({
    onSliderChange,
    numSliderValues,
    onContrastChange,
    onDatasetChange,
    datasetIndex,
    numDatasets,
}) => {
    const [imageSlice, setImageSlice] = useState(1);
    const [contrast, setContrast] = useState(1);

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
            {/* Dataset Slider (Near Top) */}
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

            {/* Image Slice + Contrast Sliders (Near Bottom) */}
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
