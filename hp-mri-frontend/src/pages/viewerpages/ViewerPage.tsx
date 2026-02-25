import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import { PulsePlotComponent } from '../../components/visualize/PulsePlotComponent';
import ViewerSidePanel from '../../components/visualize/ViewerSidePanel';
import ImageDisplayWindow from '../../components/viewer/ImageDisplayWindow';
import FileSelector from '../../components/viewer/FileSelector';
import ConcatenationPanel from '../../components/viewer/ConcatenationPanel';
import { useViewerState, MAX_WINDOWS, createInitialWindowState } from '../../hooks/useViewerState';
import '../../styles/viewerPage.css';

const ViewerPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [panelCount, setPanelCount] = useState(1);

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

  // Lock body scroll while viewer is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleHpMriData = () => setShowHpMriData(prev => !prev);
  const onThresholdChange = (_e: React.SyntheticEvent, value: number | number[]) => {
    setThreshold(Array.isArray(value) ? value[0] : value);
  };
  const onAlphaChange = (value: number) => setAlpha(value);
  const onMagnetTypeChange = (_e: React.SyntheticEvent) => {};
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

  const handleAddPanel = () => setPanelCount(prev => Math.min(prev + 1, MAX_WINDOWS));

  const handleClosePanel = (index: number) => {
    viewerState.setWindows(prev => {
      const next = [...prev];
      next.splice(index, 1);
      next.push(createInitialWindowState());
      return next;
    });
    setPanelCount(prev => Math.max(prev - 1, 1));
  };

  return (
    <>
      <HeaderAccount background_black />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} background_black />
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
        <Box
          className="panels-container"
          sx={{
            flex: '3 1 0%',
            display: 'flex',
            gap: 0.5,
            p: 0.5,
            minHeight: 0,
            position: 'relative',
            alignItems: 'stretch',
          }}
        >
          {Array.from({ length: panelCount }, (_, index) => (
            <ImageDisplayWindow
              key={index}
              windowIndex={index}
              showCloseButton={panelCount > 1}
              onClose={() => handleClosePanel(index)}
              selectedFile={viewerState.windows[index].selectedFile}
              loading={viewerState.windows[index].loading}
              error={viewerState.windows[index].error}
              imageArray={viewerState.windows[index].imageArray}
              onFileSelect={() => viewerState.updateWindow(index, { fileSelectorOpen: true })}
              onActivatePulseSource={viewerState.setPulseSourceFileId}
              channelIndex={viewerState.windows[index].channelIndex}
              sliceIndex={viewerState.windows[index].sliceIndex}
              metaboliteIndex={viewerState.windows[index].metaboliteIndex}
              measurementIndex={viewerState.windows[index].measurementIndex}
              nmrLabels={viewerState.windows[index].nmrLabels}
              setChannelIndex={(v) => viewerState.updateWindow(index, { channelIndex: v })}
              setSliceIndex={(v) => viewerState.updateWindow(index, { sliceIndex: v })}
              setMetaboliteIndex={(v) => viewerState.updateWindow(index, { metaboliteIndex: v })}
              setMeasurementIndex={(v) => viewerState.updateWindow(index, { measurementIndex: v })}
              alpha={alpha}
              colorScale={colorScale}
              scaleByIntensity={scaleByIntensity}
              showHpMriData={showHpMriData}
            />
          ))}

          {/* Add Panel Button — appears on hover when count is below max */}
          {panelCount < MAX_WINDOWS && (
            <Box
              onClick={handleAddPanel}
              sx={{
                width: 36,
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                opacity: 0.25,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 1 },
                '.panels-container:hover &': { opacity: 0.55 },
              }}
            >
              <AddCircleOutline sx={{ color: 'rgba(100,100,100,0.9)', fontSize: 28 }} />
            </Box>
          )}
        </Box>

        {/* Bottom Section - Split between Pulse Plot and Concatenation Panel */}
        <Box sx={{
          flex: '1 1 0%',
          minHeight: '100px',
          maxHeight: '40vh',
          m: 0,
          p: 0,
          display: 'flex',
          gap: 0.5
        }}>
          {/* Pulse Plot Section */}
          <Box sx={{ flex: '2 1 0%' }}>
            {viewerState.pulseSourceFileId ? (
              <PulsePlotComponent fileId={viewerState.pulseSourceFileId} sidebarWidth={sidebarWidth} />
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

          {/* Concatenation Panel Section */}
          <Box sx={{ flex: '1 1 0%', minWidth: 300 }}>
            <ConcatenationPanel
              availableFiles={viewerState.availableFiles}
              selectedFiles={viewerState.selectedFilesForConcatenation}
              concatenatedData={viewerState.concatenatedData}
              loading={viewerState.concatenationLoading}
              error={viewerState.concatenationError}
              onFileSelectionChange={viewerState.handleMultipleFileSelect}
              onPerformConcatenation={viewerState.performConcatenation}
              onLoadToWindow={viewerState.loadConcatenatedDataToWindow}
              panelCount={panelCount}
            />
          </Box>
        </Box>
      </Box>

      {/* File Selector Dialogs — always render all slots so state persists */}
      {Array.from({ length: MAX_WINDOWS }, (_, index) => (
        <FileSelector
          key={index}
          open={viewerState.windows[index].fileSelectorOpen}
          onClose={() => viewerState.updateWindow(index, { fileSelectorOpen: false })}
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
