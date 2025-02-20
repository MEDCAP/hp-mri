/**
 * @fileoverview ButtonPanel.tsx renders a panel containing interactive buttons for various
 * functionalities within HP-MRI Web Application Visualiztion.
 *
 * @version 1.2.2
 * @author Benjamin Yoon
 * @date 2024-04-30
 */

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import saveIcon from './icons/save.png';
import databaseIcon from './icons/database.png'
import rightIcon from './icons/right.png';
import upIcon from './icons/up.png';
import leftIcon from './icons/left.png';
import downIcon from './icons/down.png';
import resetIcon from './icons/reset.png';

interface ButtonProps {
    toggleHpMriData: any;
    onMoveUp: any;
    onMoveLeft: any;
    onMoveDown: any;
    onMoveRight: any;
    onResetPlotShift: any;
    onFileUpload: any;
    onThresholdChange: any;
    onToggleSelecting: any;
    onSelecting: any;
    onSetSelectedGroup: any;
    selectedGroup: any;
    onResetVoxels: any;
    threshold: any;
    onMagnetTypeChange: any;
}

const ButtonPanel: React.FC<ButtonProps> = ({
    toggleHpMriData, onMoveUp, onMoveLeft, onMoveDown, onMoveRight, onResetPlotShift,
    onFileUpload, onThresholdChange, onToggleSelecting, onSelecting, onSetSelectedGroup,
    selectedGroup, onResetVoxels, threshold, onMagnetTypeChange
}) => {
    const [isHpMriDataOn, setIsHpMriDataOn] = useState(false);
    const fileInputRef = useRef();

    /**
     * Toggles the visibility of the HP MRI plot.
     * @param {string} newStatus - 'on' to show the HP MRI plot, 'off' to hide it.
     */
    const handleToggleHpMriData = (newStatus) => {
        setIsHpMriDataOn(newStatus === 'on');
        toggleHpMriData(newStatus === 'on');
    };

    /**
     * Handles directional movement of the HP MRI plot.
     * @param {string} direction - The direction to move the plot ('up', 'down', 'left', 'right').
     */
    const handleMove = (direction) => {
        const movementActions = {
            'up': onMoveUp,
            'down': onMoveDown,
            'left': onMoveLeft,
            'right': onMoveRight
        };
        const action = movementActions[direction];
        if (action) {
            action();
        } else {
            console.error("Invalid direction");
        }
    };

    /**
     * Initiates a screen capture of the current application state and saves as PNG.
     */
    const handleSaveScreenshot = () => {
        html2canvas(document.body).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'screenshot.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    /**
     * Opens file upload dialog.
     */
    const handleFileSelect = () => {
        fileInputRef.current.click();
    };

    /**
     * Handles file selection for upload.
     * @param {Event} event - The file selection event.
     */
    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files) {
            onFileUpload(files);
        }
    };

    // Handles changing the magnet type
    const handleMagnetTypeChange = (event) => {
        onMagnetTypeChange(event.target.value);
    };

    return (
        <div className="top-panel">
            <div className="icon-button-container">
                <button className="icon-button" onClick={handleFileSelect}>
                    <img src={databaseIcon} alt="Upload Icon" className="button-icon" />
                </button>
                <span className="button-text">Database</span>
                <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                />
            </div>

            <div className="icon-button-container">
                <button className="icon-button" onClick={handleSaveScreenshot}>
                    <img src={saveIcon} alt="Save Icon" className="button-icon" />
                </button>
                <span className="button-text">Save</span>
            </div>

            <div className="hp-mri-radio-buttons">
                <label className="radio-button-label">
                    <input
                        type="radio"
                        name="hpMriStatus"
                        value="on"
                        checked={isHpMriDataOn}
                        onChange={() => handleToggleHpMriData('on')}
                    />
                    ON
                </label>
                <label className="radio-button-label">
                    <input
                        type="radio"
                        name="hpMriStatus"
                        value="off"
                        checked={!isHpMriDataOn}
                        onChange={() => handleToggleHpMriData('off')}
                    />
                    OFF
                </label>
                <span className="hp-mri-button-text">Plot Data</span>
            </div>

            <div className="button-container">
                <div className="top-button-group">
                    <button className="button" onClick={() => handleMove('up')}>
                        <img src={upIcon} alt="Up" />
                    </button>
                </div>
                <div className="bottom-button-group">
                    <button className="button" onClick={() => handleMove('left')}>
                        <img src={leftIcon} alt="Left" />
                    </button>
                    <button className="button" onClick={() => handleMove('down')}>
                        <img src={downIcon} alt="Down" />
                    </button>
                    <button className="button" onClick={() => handleMove('right')}>
                        <img src={rightIcon} alt="Right" />
                    </button>
                </div>
                <span className="button-text-shift">Plot shift</span>
            </div>

            <div className="reset-button-container">
                <button className="reset-button" onClick={onResetPlotShift}>
                    <img src={resetIcon} alt="Plot reset" className="button-reset" />
                </button>
                <span className="button-text-reset">Plot reset</span>
            </div>

            <div className="icon-button-container">
                <button className="get-voxels-button" onClick={onToggleSelecting}>
                    {onSelecting ? 'Stop Selecting' : 'Get Voxels'}
                </button>
                <button className="get-voxels-button" onClick={onResetVoxels}>
                    {'Reset'}
                </button>
                <div>
                    <label>
                        <input type="radio" checked={selectedGroup === 'A'} onChange={() => onSetSelectedGroup('A')} />
                        Group A
                    </label>
                    <label>
                        <input type="radio" checked={selectedGroup === 'B'} onChange={() => onSetSelectedGroup('B')} />
                        Group B
                    </label>
                </div>
                <span className="button-text">Functions</span>
            </div>

            <div className="slider-threshold">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={threshold}
                    onChange={onThresholdChange}
                    className="image-slice-slider"
                />
                <label
                    style={{
                        position: 'absolute',
                        left: '-30px',
                        marginTop: '-20px',
                        color: '#6c6c70',
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '15px',
                        padding: '2px 5px',
                    }}
                >{threshold}</label>
                <span className="slider-threshold-text">Threshold</span>
            </div>

            {/* Magnet Type Selection Dropdown */}
            <div className="magnet-select-container">
                <label htmlFor="magnet-select">Choose a magnet</label>
                <select id="magnet-select" onChange={handleMagnetTypeChange} defaultValue="HUPC">
                    <option value="HUPC">HUPC</option>
                    <option value="Clinical">Clinical</option>
                    <option value="MR Solutions">MR Solutions</option>
                </select>
            </div>
        </div>
    );
}

export default ButtonPanel; 