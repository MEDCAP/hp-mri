import React, { useRef } from 'react';
import {
    Box,
    IconButton,
    Drawer,
    Tooltip,
    SelectChangeEvent
} from '@mui/material';
import { CloudUpload, Save, Tune, AspectRatio, GridView, Merge } from '@mui/icons-material';
import { useScreenshot } from '../hooks/useScreenshot';
import ExportSection from './sidepanel/ExportSection';
import ImageAdjustmentsSection from './sidepanel/ImageAdjustmentsSection';
import SettingsSection from './sidepanel/SettingsSection';
import LayoutSection from './sidepanel/LayoutSection';

interface ButtonProps {
    className?: string;
    toggleHpMriData: () => void;
    onFileUpload: (files: FileList) => void;
    onThresholdChange: (event: Event, value: number | number[]) => void;
    onAlphaChange: (value: number) => void;
    threshold: number;
    alpha: number;
    onMagnetTypeChange: (event: SelectChangeEvent) => void;
    colorScale: 'Hot' | 'Jet' | 'B&W';
    onColorScaleChange: (value: 'Hot' | 'Jet' | 'B&W') => void;
    scaleByIntensity: boolean;
    onToggleScaleByIntensity: () => void;
    openDrawer: boolean;
    selectedTool: string | null;
    onOpenDrawer: (tool: string) => void;
    onContrastChange: (value: number, contrast: number) => void;
    imageSlice: number;
    contrast: number;
    setContrast: (value: number) => void;
    gifStart: number;
    setGifStart: (value: number) => void;
    gifEnd: number;
    setGifEnd: (value: number) => void;
    gifFps: number;
    setGifFps: (value: number) => void;
    gifFilename: string;
    setGifFilename: (value: string) => void;
    setImageSlice: (value: number) => void;
    onExportGif: () => void;
    sidebarWidth: number;
    cols: number;
    rows: number;
    onLayoutChange: (cols: number, rows: number) => void;
    /** Rendered when the concatenation tool is open. */
    concatenationSection: React.ReactNode;
}

const ButtonPanel: React.FC<ButtonProps> = ({
    className,
    toggleHpMriData,
    onFileUpload,
    onThresholdChange,
    onAlphaChange,
    threshold,
    alpha,
    onMagnetTypeChange,
    colorScale,
    onColorScaleChange,
    scaleByIntensity,
    onToggleScaleByIntensity,
    openDrawer,
    selectedTool,
    onOpenDrawer,
    onContrastChange,
    imageSlice,
    contrast,
    setContrast,
    gifStart,
    setGifStart,
    gifEnd,
    setGifEnd,
    gifFps,
    setGifFps,
    gifFilename,
    setGifFilename,
    onExportGif,
    sidebarWidth,
    cols,
    rows,
    onLayoutChange,
    concatenationSection,
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { filename, setFilename, handleSaveScreenshot } = useScreenshot();

    const handleFileSelect = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) onFileUpload(files);
    };

    return (
        // box viewer side bar whole
        <Box
            className={className}
            sx={{
                width: 60,
                height: '100%',
                backgroundColor: '#1e1e1e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 2,
                position: 'fixed',
                left: sidebarWidth,
                top: '60px',
                zIndex: 10,
            }}
        >
            {/* Each button icon */}
            <Box sx={{ width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <Tooltip title="Upload File" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={handleFileSelect}>
                        <CloudUpload />
                    </IconButton>
                </Tooltip>
                <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} ref={fileInputRef} />

                <Tooltip title="Screenshot & Export" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={() => onOpenDrawer('export')}>
                        <Save />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Panel Layout" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={() => onOpenDrawer('layout')}>
                        <GridView />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Concatenate Files" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={() => onOpenDrawer('concatenate')}>
                        <Merge />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Image Adjustments" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={() => onOpenDrawer('image')}>
                        <AspectRatio />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Settings" placement="right">
                    <IconButton sx={{ color: 'white' }} onClick={() => onOpenDrawer('settings')}>
                        <Tune />
                    </IconButton>
                </Tooltip>
            </Box>
            {/* Open drawer when button is clicked */}
            <Drawer
                anchor="left"
                open={openDrawer}
                onClose={() => onOpenDrawer('')}
                variant="persistent"
                hideBackdrop
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 320,
                        padding: 3,
                        background: '#2b2b2b',
                        color: 'white',
                        borderRadius: '0px 10px 10px 0px',
                        marginLeft: `${sidebarWidth + 60}px`,
                        boxShadow: '4px 0px 8px rgba(0,0,0,0.3)',
                        height: '100%',
                        zIndex: 1200,
                    },
                }}
                ModalProps={{
                    keepMounted: true,
                    BackdropProps: { style: { backgroundColor: 'transparent' } },
                }}
            >
                <IconButton
                    onClick={() => onOpenDrawer('')}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'white',
                        width: 24,
                        height: 24,
                        fontSize: '16px',
                        padding: 0,
                        minWidth: 'unset',
                        border: '1px solid white',
                        borderRadius: '4px',
                        lineHeight: 1,
                    }}
                >
                    ✕
                </IconButton>

                {selectedTool === 'export' && <ExportSection gifStart={gifStart} setGifStart={setGifStart} gifEnd={gifEnd} setGifEnd={setGifEnd} gifFps={gifFps} setGifFps={setGifFps} gifFilename={gifFilename} setGifFilename={setGifFilename} onExportGif={onExportGif} filename={filename} setFilename={setFilename} onSaveScreenshot={handleSaveScreenshot} />}

                {/* Panel layout button */}
                {selectedTool === 'layout' && <LayoutSection cols={cols} rows={rows} onLayoutChange={onLayoutChange} />}
                {selectedTool === 'concatenate' && concatenationSection}
                {/* Image Adjustment button */}
                {selectedTool === 'image' && <ImageAdjustmentsSection contrast={contrast} setContrast={setContrast} onContrastChange={onContrastChange} imageSlice={imageSlice} alpha={alpha} onAlphaChange={onAlphaChange} />}
                {/* Setting button */}
                {selectedTool === 'settings' && <SettingsSection toggleHpMriData={toggleHpMriData} threshold={threshold} onThresholdChange={onThresholdChange} scaleByIntensity={scaleByIntensity} onToggleScaleByIntensity={onToggleScaleByIntensity} colorScale={colorScale} onColorScaleChange={onColorScaleChange} onMagnetTypeChange={onMagnetTypeChange} />}
            </Drawer>
        </Box>
    );
};

export default ButtonPanel;
