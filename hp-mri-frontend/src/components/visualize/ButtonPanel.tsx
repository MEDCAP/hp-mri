/**
 * @fileoverview ButtonPanel.tsx: Improved Photoshop-style UI for HP-MRI Visualization.
 *
 * @version 2.0.1
 * @author Ben Yoon
 * @date 2025-03-03
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
    Switch,
    FormControlLabel,
    Button,
    Divider,
    Tooltip,
} from '@mui/material';
import { CloudUpload, Save, Tune, GridOn, AspectRatio, RestartAlt } from '@mui/icons-material';

interface ButtonProps {
    className?: string;
    toggleHpMriData: any;
    onMoveUp: any;
    onMoveLeft: any;
    onMoveDown: any;
    onMoveRight: any;
    onResetPlotShift: any;
    onFileUpload: any;
    onThresholdChange: any;
    onAlphaChange: any;
    onMetaboliteChange: any;
    onToggleSelecting: any;
    onSelecting: any;
    onSetSelectedGroup: any;
    selectedGroup: any;
    onResetVoxels: any;
    threshold: any;
    alpha: number;
    metabolite: number;
    onMagnetTypeChange: any;
    mode: 'spectral' | 'imaging';
    colorScale: 'Hot' | 'Jet' | 'B&W';
    onColorScaleChange: (value: 'Hot' | 'Jet' | 'B&W') => void;
    scaleByIntensity: boolean;
    onToggleScaleByIntensity: () => void;
}

const ButtonPanel: React.FC<ButtonProps> = ({
    className,
    toggleHpMriData,
    onMoveUp,
    onMoveLeft,
    onMoveDown,
    onMoveRight,
    onResetPlotShift,
    onFileUpload,
    onThresholdChange,
    onAlphaChange,
    onMetaboliteChange,
    onToggleSelecting,
    onSelecting,
    onSetSelectedGroup,
    selectedGroup,
    onResetVoxels,
    threshold,
    alpha,
    metabolite,
    onMagnetTypeChange,
    mode,
    colorScale,
    onColorScaleChange,
    scaleByIntensity,
    onToggleScaleByIntensity,
}) => {
    const [openDrawer, setOpenDrawer] = useState(false);
    const [selectedTool, setSelectedTool] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleOpenDrawer = (tool: string) => {
        setSelectedTool(tool);
        setOpenDrawer(true);
    };

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

    const handleFileSelect = () => fileInputRef.current?.click();
    const handleFileChange = (event: { target: { files: any } }) => {
        const files = event.target.files;
        if (files) onFileUpload(files);
    };

    return (
        <Box
            className={className}
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
            <Box sx={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingY: 2 }}>
                <Tooltip title="Upload File" placement="right">
                    <IconButton color="primary" onClick={handleFileSelect}>
                        <CloudUpload />
                    </IconButton>
                </Tooltip>
                <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} ref={fileInputRef} />

                <Tooltip title="Save Screenshot" placement="right">
                    <IconButton color="primary" onClick={handleSaveScreenshot}>
                        <Save />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Plot Shift" placement="right">
                    <IconButton color="primary" onClick={() => handleOpenDrawer('plot')}>
                        <GridOn />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Image Adjustments" placement="right">
                    <IconButton color="primary" onClick={() => handleOpenDrawer('image')}>
                        <AspectRatio />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Reset Plot" placement="right">
                    <IconButton color="primary" onClick={onResetPlotShift}>
                        <RestartAlt />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Settings" placement="right">
                    <IconButton color="primary" onClick={() => handleOpenDrawer('settings')}>
                        <Tune />
                    </IconButton>
                </Tooltip>
            </Box>

            <Drawer
                anchor="right"
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 320,
                        padding: 3,
                        background: '#2b2b2b',
                        color: 'white',
                        borderRadius: '10px 0px 0px 10px',
                        boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
                    },
                }}
                ModalProps={{
                    keepMounted: true,
                    BackdropProps: { style: { backgroundColor: 'transparent' } },
                }}
            >
                {selectedTool === 'plot' && (
                    <>
                        <Typography variant="h6" sx={{ color: '#00c7be', mb: 2 }}>
                            Plot Shift
                        </Typography>
                        <Box display="flex" justifyContent="center">
                            <Button variant="contained" color="secondary" onClick={onMoveUp}>⬆️</Button>
                        </Box>
                        <Box display="flex" justifyContent="center" mt={1}>
                            <Button variant="contained" color="secondary" onClick={onMoveLeft}>⬅️</Button>
                            <Button variant="contained" color="secondary" onClick={onMoveDown} sx={{ mx: 1 }}>⬇️</Button>
                            <Button variant="contained" color="secondary" onClick={onMoveRight}>➡️</Button>
                        </Box>
                        <Button variant="outlined" fullWidth onClick={onResetPlotShift} sx={{ mt: 3, color: 'white' }}>
                            Reset
                        </Button>
                    </>
                )}

                {selectedTool === 'image' && (
                    <>
                        <Typography variant="h6" sx={{ color: '#00c7be', mb: 2 }}>
                            Voxel Selection
                        </Typography>
                        <Button fullWidth variant="contained" color="primary" onClick={onToggleSelecting}>
                            {onSelecting ? 'Stop Selecting' : 'Get Voxels'}
                        </Button>
                        <Button fullWidth variant="outlined" color="secondary" onClick={onResetVoxels} sx={{ mt: 1 }}>
                            Reset
                        </Button>
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
                        <Typography variant="h6" sx={{ color: '#00c7be', mb: 2 }}>
                            Settings
                        </Typography>
                        <FormControlLabel
                            control={<Switch onChange={toggleHpMriData} color="primary" />}
                            label="Show HP-MRI Data"
                        />
                        <Divider sx={{ my: 2, background: 'white' }} />
                        {mode === 'spectral' ? (
                            <>
                                <Typography variant="body1">Threshold</Typography>
                                <Slider value={threshold} min={0} max={1} step={0.1} onChange={onThresholdChange} />
                            </>
                        ) : (
                            <>
                                <Typography variant="body1">Alpha</Typography>
                                <Typography variant="body1">Alpha: {alpha.toFixed(2)}</Typography>
                                <Slider
                                    value={alpha}
                                    min={0.0}
                                    max={1.0}
                                    step={0.05}
                                    onChange={(_e, newValue) => onAlphaChange(newValue as number)} // ensure numeric
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={scaleByIntensity}
                                            onChange={onToggleScaleByIntensity}
                                            color="primary"
                                        />
                                    }
                                    label="Scale by Intensity"
                                />
                                <Typography variant="body1">Metabolite</Typography>
                                <Select
                                    value={metabolite}
                                    onChange={(e) => onMetaboliteChange(Number(e.target.value))} // cast string to number
                                    fullWidth
                                >
                                    <MenuItem value={0}>Lactate</MenuItem>
                                    <MenuItem value={1}>Pyruvate</MenuItem>
                                    <MenuItem value={2}>Threonine</MenuItem>
                                </Select>
                                <Typography variant="body1">Heatmap Color Scale</Typography>
                                <Select
                                    value={colorScale}
                                    onChange={(e) => onColorScaleChange(e.target.value as 'Hot' | 'Jet' | 'B&W')}
                                    fullWidth
                                >
                                    <MenuItem value="Hot">Hot</MenuItem>
                                    <MenuItem value="Jet">Jet</MenuItem>
                                    <MenuItem value="B&W">Black & White</MenuItem>
                                </Select>

                            </>
                        )}

                        <Divider sx={{ my: 2, background: 'white' }} />
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
