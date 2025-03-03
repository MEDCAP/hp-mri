/**
 * @fileoverview ButtonPanel.tsx: Redesigned Photoshop-style UI for HP-MRI Visualization.
 *
 * @version 2.0
 * @author Benjamin Yoon
 * @date 2025-03-02
 */

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
    Box,
    IconButton,
    Drawer,
    Slider,
    Typography,
    Select,
    MenuItem,
} from '@mui/material';
import { CloudUpload, Save, Tune, GridOn, AspectRatio, RestartAlt } from '@mui/icons-material';

interface ButtonProps {
    className?: string; // ✅ Allow optional className
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
    className,  // ✅ Add className here
    toggleHpMriData,
    onMoveUp,
    onMoveLeft,
    onMoveDown,
    onMoveRight,
    onResetPlotShift,
    onFileUpload,
    onThresholdChange,
    onToggleSelecting,
    onSelecting,
    onSetSelectedGroup,
    selectedGroup,
    onResetVoxels,
    threshold,
    onMagnetTypeChange
}) => {

    const [openDrawer, setOpenDrawer] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Toggle Right Panel
    const handleOpenDrawer = (tool: string) => {
        setSelectedTool(tool);
        setOpenDrawer(true);
    };

    // Screenshot Function
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

    // File Upload
    const handleFileSelect = () => fileInputRef.current?.click();
    const handleFileChange = (event: { target: { files: any; }; }) => {
        const files = event.target.files;
        if (files) onFileUpload(files);
    };

    return (
        <Box
    className={className} // ✅ Now `className` is correctly passed
    sx={{
        width: 60,
        height: '100vh',
        backgroundColor: '#1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 2,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 10,
    }}
>



            {/* Left Sidebar Toolbar */}
            <Box
                sx={{
                    width: 60,
                    backgroundColor: '#222',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingY: 2,
                }}
            >
                <IconButton color="primary" onClick={handleFileSelect}>
                    <CloudUpload />
                </IconButton>
                <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} ref={fileInputRef} />

                <IconButton color="primary" onClick={handleSaveScreenshot}>
                    <Save />
                </IconButton>

                <IconButton color="primary" onClick={() => handleOpenDrawer('plot')}>
                    <GridOn />
                </IconButton>

                <IconButton color="primary" onClick={() => handleOpenDrawer('image')}>
                    <AspectRatio />
                </IconButton>

                <IconButton color="primary" onClick={onResetPlotShift}>
                    <RestartAlt />
                </IconButton>

                <IconButton color="primary" onClick={() => handleOpenDrawer('settings')}>
                    <Tune />
                </IconButton>
            </Box>

            {/* Right Panel (Settings Drawer) */}
            <Drawer
                anchor="right"
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                sx={{ '& .MuiDrawer-paper': { width: 300, padding: 2 } }}
            >
                {selectedTool === 'plot' && (
                    <>
                        <Typography variant="h6">Plot Shift</Typography>
                        <Box display="flex" justifyContent="space-between">
                            <IconButton onClick={onMoveUp}>⬆️</IconButton>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                            <IconButton onClick={onMoveLeft}>⬅️</IconButton>
                            <IconButton onClick={onMoveDown}>⬇️</IconButton>
                            <IconButton onClick={onMoveRight}>➡️</IconButton>
                        </Box>
                        <IconButton onClick={onResetPlotShift} sx={{ mt: 2 }}>Reset</IconButton>
                    </>
                )}

                {selectedTool === 'image' && (
                    <>
                        <Typography variant="h6">Voxel Selection</Typography>
                        <button onClick={onToggleSelecting}>
                            {onSelecting ? 'Stop Selecting' : 'Get Voxels'}
                        </button>
                        <button onClick={onResetVoxels}>Reset</button>
                        <Box mt={2}>
                            <Typography variant="body1">Select Group:</Typography>
                            <label>
                                <input type="radio" checked={selectedGroup === 'A'} onChange={() => onSetSelectedGroup('A')} />
                                Group A
                            </label>
                            <label>
                                <input type="radio" checked={selectedGroup === 'B'} onChange={() => onSetSelectedGroup('B')} />
                                Group B
                            </label>
                        </Box>
                    </>
                )}

                {selectedTool === 'settings' && (
                    <>
                        <Typography variant="h6">Threshold</Typography>
                        <Slider
                            value={threshold}
                            min={0}
                            max={1}
                            step={0.1}
                            onChange={onThresholdChange}
                        />
                        <Typography>{threshold}</Typography>

                        <Typography variant="h6">Magnet Type</Typography>
                        <Select defaultValue="HUPC" onChange={onMagnetTypeChange}>
                            <MenuItem value="HUPC">HUPC</MenuItem>
                            <MenuItem value="Clinical">Clinical</MenuItem>
                            <MenuItem value="MR Solutions">MR Solutions</MenuItem>
                        </Select>
                    </>
                )}
            </Drawer>
        </Box>
    );
};

export default ButtonPanel;
