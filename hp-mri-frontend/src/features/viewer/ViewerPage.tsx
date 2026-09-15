import React, { useState } from 'react';
import { Box } from '@mui/material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import ViewerSidePanel from './components/ViewerSidePanel';
import ImageDisplayWindow from './components/ImageDisplayWindow';
import FileSelector from './components/FileSelector';
import { useViewerState } from './hooks/useViewerState';

// Add global styles to override any border styling
const viewerStyles = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    overflow: hidden !important;
    width: 100vw !important;
    height: 100vh !important;
  }
  
  #root {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    width: 100vw !important;
    height: 100vh !important;
    display: block !important;
    background: none !important;
  }
  
  /* Override any parent flex container */
  body > div {
    display: block !important;
  }
  
  /* Override root background */
  :root {
    background-color: transparent !important;
  }
  
  /* Ensure viewer page fills entire viewport */
  body {
    background-color: #f5f5f5 !important;
  }
`;

const ViewerPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Use the custom hook for viewer state management
  const viewerState = useViewerState();

  // Global settings state
  const [showHpMriData, setShowHpMriData] = useState(true);
  const [threshold, setThreshold] = useState(0.1);
  const [alpha, setAlpha] = useState(1.0);
  const [colorScale, setColorScale] = useState<'Hot' | 'Jet' | 'B&W'>('Hot');
  const [scaleByIntensity, setScaleByIntensity] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageSlice, setImageSlice] = useState(0);
  const [contrast, setContrast] = useState(1.0);
  const [gifStart, setGifStart] = useState(0);
  const [gifEnd, setGifEnd] = useState(10);
  const [gifFps, setGifFps] = useState(10);
  const [gifFilename, setGifFilename] = useState('animation.gif');

  const sidebarWidth = isSidebarOpen ? 240 : 80;

  const toggleHpMriData = () => setShowHpMriData(prev => !prev);
  const onThresholdChange = (_e: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setThreshold(v);
  };
  const onAlphaChange = (value: number) => setAlpha(value);
  const onMagnetTypeChange = () => {};
  const onColorScaleChange = (value: 'Hot' | 'Jet' | 'B&W') => setColorScale(value);
  const onToggleScaleByIntensity = () => setScaleByIntensity(prev => !prev);
  const onOpenDrawer = (tool: string) => {
    if (!tool) {
      setOpenDrawer(false);
      setSelectedTool(null);
      return;
    }
    
    if (selectedTool === tool && openDrawer) {
      setOpenDrawer(false);
      setSelectedTool(null);
    } else {
      setSelectedTool(tool);
      setOpenDrawer(true);
    }
  };
  const onContrastChange = (_slice: number, value: number) => setContrast(value);
  const onFileUpload = () => {};
  const onExportGif = () => {};

  return (
    <>
      <style>{viewerStyles}</style>
      <HeaderAccount background_black />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} background_black/>
      <ViewerSidePanel
        toggleHpMriData={toggleHpMriData}
        onFileUpload={onFileUpload}
        onThresholdChange={onThresholdChange}
        onAlphaChange={onAlphaChange}
        threshold={threshold}
        alpha={alpha}
        onMagnetTypeChange={onMagnetTypeChange}
        colorScale={colorScale}
        onColorScaleChange={onColorScaleChange}
        scaleByIntensity={scaleByIntensity}
        onToggleScaleByIntensity={onToggleScaleByIntensity}
        openDrawer={openDrawer}
        selectedTool={selectedTool}
        onOpenDrawer={onOpenDrawer}
        onContrastChange={onContrastChange}
        imageSlice={imageSlice}
        contrast={contrast}
        setContrast={setContrast}
        gifStart={gifStart}
        setGifStart={setGifStart}
        gifEnd={gifEnd}
        setGifEnd={setGifEnd}
        gifFps={gifFps}
        setGifFps={setGifFps}
        gifFilename={gifFilename}
        setGifFilename={setGifFilename}
        setImageSlice={setImageSlice}
        onExportGif={onExportGif}
        sidebarWidth={sidebarWidth}
        cols={viewerState.cols}
        rows={viewerState.rows}
        onLayoutChange={viewerState.setLayout}
      />
      
      {/* Main Content Area */}
      <Box sx={{ 
        position: 'fixed',
        top: '64px',
        left: `${sidebarWidth + 60}px`,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        margin: 0,
        padding: 0,
        border: 'none',
        outline: 'none',
        overflow: 'hidden'
      }}>
        {/* Image display panels, filling the whole content area */}
        <Box id="viewer-grid-root" sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          // minmax(0, 1fr) rather than 1fr: Plotly children have an intrinsic
          // width that would otherwise push the tracks past the container.
          gridTemplateColumns: `repeat(${viewerState.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${viewerState.rows}, minmax(0, 1fr))`,
          gap: 0.5,
          p: 0.5
        }}>
          {viewerState.visibleWindows.map((window, index) => (
            <ImageDisplayWindow
              key={index}
              window={window}
              onFileSelect={() => viewerState.setFileSelectorOpen(index, true)}
              onSelectArray={(key) => {
                if (window.selectedFile) viewerState.selectArray(index, window.selectedFile._id, key);
              }}
              setChannelIndex={(value) => viewerState.setChannelIndex(index, value)}
              setSliceIndex={(value) => viewerState.setSliceIndex(index, value)}
              setMetaboliteIndex={(value) => viewerState.setMetaboliteIndex(index, value)}
              setMeasurementIndex={(value) => viewerState.setMeasurementIndex(index, value)}
              alpha={alpha}
              colorScale={colorScale}
              scaleByIntensity={scaleByIntensity}
              showHpMriData={showHpMriData}
            />
          ))}
        </Box>
        </Box>

        {/* File Selector Dialogs */}
        {viewerState.visibleWindows.map((window, index) => (
          <FileSelector
            key={index}
            open={window.fileSelectorOpen}
            onClose={() => viewerState.setFileSelectorOpen(index, false)}
            onSelect={(file) => viewerState.handleFileSelect(file, index)}
            windowNumber={index + 1}
            availableFiles={viewerState.availableFiles}
            filesLoading={viewerState.filesLoading}
          />
        ))}
    </>
  );
};

export default ViewerPage;