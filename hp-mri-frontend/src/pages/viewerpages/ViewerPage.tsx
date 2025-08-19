import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import { PulsePlotComponent } from '../../components/visualize/PulsePlotComponent';
import ViewerSidePanel from '../../components/visualize/ViewerSidePanel';
import ImageDisplayWindow from '../../components/viewer/ImageDisplayWindow';
import FileSelector from '../../components/viewer/FileSelector';
import { useViewerState } from '../../hooks/useViewerState';

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
  const onThresholdChange = (_e: any, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    setThreshold(v);
  };
  const onAlphaChange = (value: number) => setAlpha(value);
  const onMagnetTypeChange = (_e: any) => {};
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
  const onFileUpload = (_files: FileList) => {};
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
        {/* Top Section - Image Display Windows */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          gap: 0.5,
          p: 0.5,
          minHeight: 0 // Important for flex child
        }}>
          <ImageDisplayWindow
            windowNumber={1}
            selectedFile={viewerState.selectedFile1}
            loading={viewerState.loading1}
            error={viewerState.error1}
            imageArray={viewerState.imageArray1}
            onFileSelect={() => viewerState.setFileSelectorOpen1(true)}
            onActivatePulseSource={viewerState.setPulseSourceFileId}
            channelIndex={viewerState.channelIndex1}
            sliceIndex={viewerState.sliceIndex1}
            metaboliteIndex={viewerState.metaboliteIndex1}
            measurementIndex={viewerState.measurementIndex1}
            nmrLabels={viewerState.nmrLabels1}
            setChannelIndex={viewerState.setChannelIndex1}
            setSliceIndex={viewerState.setSliceIndex1}
            setMetaboliteIndex={viewerState.setMetaboliteIndex1}
            setMeasurementIndex={viewerState.setMeasurementIndex1}
            alpha={alpha}
            colorScale={colorScale}
            scaleByIntensity={scaleByIntensity}
            showHpMriData={showHpMriData}
          />
          <ImageDisplayWindow
            windowNumber={2}
            selectedFile={viewerState.selectedFile2}
            loading={viewerState.loading2}
            error={viewerState.error2}
            imageArray={viewerState.imageArray2}
            onFileSelect={() => viewerState.setFileSelectorOpen2(true)}
            onActivatePulseSource={viewerState.setPulseSourceFileId}
            channelIndex={viewerState.channelIndex2}
            sliceIndex={viewerState.sliceIndex2}
            metaboliteIndex={viewerState.metaboliteIndex2}
            measurementIndex={viewerState.measurementIndex2}
            nmrLabels={viewerState.nmrLabels2}
            setChannelIndex={viewerState.setChannelIndex2}
            setSliceIndex={viewerState.setSliceIndex2}
            setMetaboliteIndex={viewerState.setMetaboliteIndex2}
            setMeasurementIndex={viewerState.setMeasurementIndex2}
            alpha={alpha}
            colorScale={colorScale}
            scaleByIntensity={scaleByIntensity}
            showHpMriData={showHpMriData}
          />
          <ImageDisplayWindow
            windowNumber={3}
            selectedFile={viewerState.selectedFile3}
            loading={viewerState.loading3}
            error={viewerState.error3}
            imageArray={viewerState.imageArray3}
            onFileSelect={() => viewerState.setFileSelectorOpen3(true)}
            onActivatePulseSource={viewerState.setPulseSourceFileId}
            channelIndex={viewerState.channelIndex3}
            sliceIndex={viewerState.sliceIndex3}
            metaboliteIndex={viewerState.metaboliteIndex3}
            measurementIndex={viewerState.measurementIndex3}
            nmrLabels={viewerState.nmrLabels3}
            setChannelIndex={viewerState.setChannelIndex3}
            setSliceIndex={viewerState.setSliceIndex3}
            setMetaboliteIndex={viewerState.setMetaboliteIndex3}
            setMeasurementIndex={viewerState.setMeasurementIndex3}
            alpha={alpha}
            colorScale={colorScale}
            scaleByIntensity={scaleByIntensity}
            showHpMriData={showHpMriData}
          />
        </Box>

        {/* Bottom Section - Pulse Plot */}
        <Box sx={{
          height: '300px', // Increased height to extend further down
          m: 0, // Remove all margins
          p: 0 // Remove all padding
        }}>
          {viewerState.pulseSourceFileId ? (
            <PulsePlotComponent fileId={viewerState.pulseSourceFileId} />
          ) : (
            <Box sx={{
              height: '100%',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#666',
              textAlign: 'center',
              gap: 2
            }}>
              <Typography variant="h6" fontWeight="medium">
                Pulse Data Plot
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 400 }}>
                To view pulse data, load an image in any window and click the pulse button (⚡) in the top-right corner of that window.
              </Typography>
            </Box>
          )}
          </Box>
        </Box>

        {/* File Selector Dialogs */}
        <FileSelector
        open={viewerState.fileSelectorOpen1}
        onClose={() => viewerState.setFileSelectorOpen1(false)}
        onSelect={(file) => viewerState.handleFileSelect(file, 1)}
          windowNumber={1}
        availableFiles={viewerState.availableFiles}
        filesLoading={viewerState.filesLoading}
        />
        <FileSelector
        open={viewerState.fileSelectorOpen2}
        onClose={() => viewerState.setFileSelectorOpen2(false)}
        onSelect={(file) => viewerState.handleFileSelect(file, 2)}
          windowNumber={2}
        availableFiles={viewerState.availableFiles}
        filesLoading={viewerState.filesLoading}
        />
        <FileSelector
        open={viewerState.fileSelectorOpen3}
        onClose={() => viewerState.setFileSelectorOpen3(false)}
        onSelect={(file) => viewerState.handleFileSelect(file, 3)}
          windowNumber={3}
        availableFiles={viewerState.availableFiles}
        filesLoading={viewerState.filesLoading}
      />
    </>
  );
};

export default ViewerPage;