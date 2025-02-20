/**
 * @fileoverview ControlPanel.tsx manages the interactive UI elements for the HP MRI App Visualization.
 *
 * @version 1.2.2
 * @author Benjamin Yoon
 * @date 2024-04-30
 */

import React, { useState, useEffect } from 'react';

interface ControlProps {
    onSliderChange: any;
    numSliderValues: any;
    onContrastChange: any;
    onDatasetChange: any;
    datasetIndex: any;
    numDatasets: any;
}

const ControlPanel: React.FC<ControlProps> = ({ onSliderChange, numSliderValues, onContrastChange, onDatasetChange, datasetIndex, numDatasets }) => {
    const [sliderValue, setSliderValue] = useState(1);
    const [contrastValue, setContrastValue] = useState(1);

    useEffect(() => {
        const slider = document.getElementById('imageSliceSlider');
        const sliderValueDisplay = document.getElementById('sliderValueDisplay');

        function updateSliderValueDisplay() {
            const percentage = (slider.value - slider.min) / (slider.max - slider.min);
            const sliderWidth = slider.getBoundingClientRect().width;
            const valueDisplayWidth = sliderValueDisplay.offsetWidth;
            const leftPosition = percentage * sliderWidth - (valueDisplayWidth / 2) + 22 - slider.value;

            sliderValueDisplay.style.left = `${leftPosition}px`;
            sliderValueDisplay.textContent = slider.value;
        }

        updateSliderValueDisplay();
        slider.addEventListener('input', updateSliderValueDisplay);
        window.addEventListener('resize', updateSliderValueDisplay);

        return () => {
            slider.removeEventListener('input', updateSliderValueDisplay);
            window.removeEventListener('resize', updateSliderValueDisplay);
        };
    }, []);

    const handleImageSliceChange = (event) => {
        const newValue = parseInt(event.target.value);
        setSliderValue(newValue);
        onSliderChange(newValue, contrastValue);
    };

    const handleContrastAdjustment = (event) => {
        const newContrastValue = parseFloat(event.target.value);
        setContrastValue(newContrastValue);
        onContrastChange(sliderValue, newContrastValue);
    };

    const handleDatasetSelection = (event) => {
        const newDatasetIndex = parseInt(event.target.value);
        onDatasetChange(newDatasetIndex);
    };

    return (
        <div>
            <div className="slider-under-top-panel">
                <input
                    type="range"
                    min="1"
                    max={numSliderValues}
                    value={sliderValue}
                    onChange={handleImageSliceChange}
                    className="image-slice-slider"
                    id="imageSliceSlider"
                />
                <div
                    id="sliderValueDisplay"
                    className="slider-value-display"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '-2.5em',
                        color: '#6c6c70',
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '1em',
                        padding: '2px 5px',
                    }}
                >
                    {sliderValue}
                </div>
            </div>
            <div className="slider-container">
                <div className="vertical-slider-container">
                    <h2><label htmlFor="contrastSlider">Contrast: {contrastValue}</label></h2>
                    <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.1"
                        value={contrastValue}
                        onChange={handleContrastAdjustment}
                        className="vertical-slider"
                        id="contrastSlider"
                    />
                </div>

                <div className="vertical-slider-container">
                    <h2><label htmlFor="datasetSlider">Dataset: {datasetIndex}</label></h2>
                    <input
                        type="range"
                        min="0"
                        max={numDatasets}
                        value={datasetIndex}
                        onChange={handleDatasetSelection}
                        className="vertical-slider"
                        id="datasetSlider"
                    />
                </div>
            </div>
        </div>
    );
}

export default ControlPanel; 