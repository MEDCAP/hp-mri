import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import { SIDEBAR_OPEN_WIDTH, SIDEBAR_CLOSED_WIDTH } from '../../layouts/layoutConstants';
import { MRDFile } from '../../types/mrd';
import ViewerSidePanel from './components/ViewerSidePanel';
import ImageDisplayWindow from './components/ImageDisplayWindow';
import FileSelector from './components/FileSelector';
import ConcatenationSection from './components/sidepanel/ConcatenationSection';
import { useViewerState, MAX_COLS } from './hooks/useViewerState';

/** Width of the viewer's tool strip, between the sidebar and the panels. */
const TOOL_STRIP_WIDTH = 60;
const HEADER_HEIGHT = 64;

/** Route state set by the file list when a row is double-clicked. */
interface ViewerLocationState {
  preloadFile?: MRDFile;
}

const ViewerPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const viewerState = useViewerState();
  const { handleFileSelect } = viewerState;

  // Open a file passed from the file list in the first panel
  const preloadFile = (location.state as ViewerLocationState | null)?.preloadFile;
  useEffect(() => {
    if (preloadFile) handleFileSelect(preloadFile, 0);
  }, [preloadFile, handleFileSelect]);

  // The viewer fills the viewport; lock page scroll while it is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

  const sidebarWidth = isSidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH;
  const panelCount = viewerState.visibleWindows.length;

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
        concatenationSection={
          <ConcatenationSection
            availableFiles={viewerState.availableFiles}
            selectedFiles={viewerState.concatenationFiles}
            result={viewerState.concatenation}
            loading={viewerState.concatenationLoading}
            error={viewerState.concatenationError}
            onSelectionChange={viewerState.setConcatenationFiles}
            onConcatenate={viewerState.performConcatenation}
            onLoadToWindow={viewerState.loadConcatenationToWindow}
            panelCount={panelCount}
          />
        }
      />

      {/* Main Content Area */}
      <Box sx={{
        position: 'fixed',
        top: `${HEADER_HEIGHT}px`,
        left: `${sidebarWidth + TOOL_STRIP_WIDTH}px`,
        right: 0,
        bottom: 0,
        display: 'flex',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden'
      }}>
        {/* Image display panels, filling the whole content area */}
        <Box id="viewer-grid-root" sx={{
          flex: 1,
          minWidth: 0,
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
              windowIndex={index}
              window={window}
              showCloseButton={panelCount > 1}
              onClose={() => viewerState.closePanel(index)}
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

        {/* Add a column of panels; brightens on hover */}
        {viewerState.cols < MAX_COLS && (
          <Box
            onClick={viewerState.addPanel}
            title="Add a panel"
            sx={{
              width: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              opacity: 0.25,
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 1 },
            }}
          >
            <AddCircleOutline sx={{ color: 'rgba(100,100,100,0.9)', fontSize: 28 }} />
          </Box>
        )}
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
