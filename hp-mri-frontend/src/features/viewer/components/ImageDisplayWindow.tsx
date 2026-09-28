import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Fade,
  useTheme,
  Tooltip,
  Chip
} from '@mui/material';
import {
  AddPhotoAlternate,
  SwapHoriz,
  Close
} from '@mui/icons-material';
import ImagingPlotComponent from './ImagingPlotComponent';
import TracePlotComponent from './TracePlotComponent';
import InlineControls from './InlineControls';
import FileDetailsModal from './FileDetailsModal';
import ArrayMenuButton from './ArrayMenuButton';
import { ViewerWindowState } from '../hooks/useViewerState';

interface ImageDisplayWindowProps {
  windowIndex: number;
  window: ViewerWindowState;
  showCloseButton: boolean;
  onClose: () => void;
  onFileSelect: () => void;
  onSelectArray: (key: string) => void;
  // Control setters
  setChannelIndex: (value: number[]) => void;
  setSliceIndex: (value: number) => void;
  setMetaboliteIndex: (value: number) => void;
  setMeasurementIndex: (value: number) => void;
  // Global settings
  alpha: number;
  colorScale: 'Hot' | 'Jet' | 'B&W';
  scaleByIntensity: boolean;
  showHpMriData: boolean;
}

const ImageDisplayWindow: React.FC<ImageDisplayWindowProps> = ({
  windowIndex,
  window,
  showCloseButton,
  onClose,
  onFileSelect,
  onSelectArray,
  setChannelIndex,
  setSliceIndex,
  setMetaboliteIndex,
  setMeasurementIndex,
  alpha,
  colorScale,
  scaleByIntensity,
  showHpMriData
}) => {
  const {
    selectedFile,
    arrays,
    arraysLoading,
    selectedArrayKey,
    kind,
    loading,
    error,
    imageArray,
    traceArray,
    channelIndex,
    sliceIndex,
    metaboliteIndex,
    measurementIndex,
    labels,
  } = window;
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [fileDetailsOpen, setFileDetailsOpen] = useState(false);

  const isImage = kind === 'image';
  const hasData = isImage ? imageArray.length > 0 : traceArray.length > 0;

  // Memoize the renderers to prevent unnecessary re-renders
  const memoizedImagingPlot = useMemo(() => (
    <ImagingPlotComponent
      data={imageArray}
      channelIndex={channelIndex}
      sliceIndex={sliceIndex}
      metaboliteIndex={metaboliteIndex}
      measurementIndex={measurementIndex}
      alpha={alpha}
      colorScale={colorScale}
      scaleByIntensity={scaleByIntensity}
      showHpMriData={showHpMriData}
    />
  ), [imageArray, channelIndex, sliceIndex, metaboliteIndex, measurementIndex, alpha, colorScale, scaleByIntensity, showHpMriData]);

  const memoizedTracePlot = useMemo(() => (
    <TracePlotComponent data={traceArray} measurementIndex={measurementIndex} />
  ), [traceArray, measurementIndex]);

  const renderBody = () => {
    if (loading || arraysLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white', gap: 2 }}>
          <Box sx={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }} />
          <Typography variant="body2">
            {arraysLoading ? 'Reading MRD file...' : 'Loading array data...'}
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ff6b6b', gap: 2, textAlign: 'center', p: 2 }}>
          <Typography variant="body2" fontWeight="medium">Error: {error}</Typography>
        </Box>
      );
    }

    if (!hasData) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white', gap: 2, textAlign: 'center', p: 2 }}>
          <AddPhotoAlternate sx={{ fontSize: 48, opacity: 0.7 }} />
          <Typography variant="h6" fontWeight="medium">No Data</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Select an MRD file to display its arrays
          </Typography>
        </Box>
      );
    }

    // Images are square; traces should use the whole panel. The top padding
    // keeps Plotly's mode bar clear of the header overlay.
    if (!isImage) {
      return <Box sx={{ width: '100%', height: '100%', pt: 4 }}>{memoizedTracePlot}</Box>;
    }

    return (
      <Box sx={{
        width: '100%',
        height: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {memoizedImagingPlot}
        </Box>
      </Box>
    );
  };

  const handleWindowClick = () => {
    if (!selectedFile) {
      onFileSelect();
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        backgroundColor: '#000',
        border: `2px solid ${isHovered ? theme.palette.primary.main : '#333'}`,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        cursor: selectedFile ? 'default' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(selectedFile ? {
          '&:hover': {
            borderColor: theme.palette.primary.main,
          }
        } : {
          // Animation when no file is selected
          '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
          }
        })
      }}
      onClick={!selectedFile ? handleWindowClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with file info and controls */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: `linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)`,
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 0.5
      }}>
        {/* Left side - File name and selector button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          {selectedFile ? (
            <>
              <Tooltip title="Click to view file details" placement="bottom" arrow>
                <Chip
                  label={selectedFile.fileName}
                  onClick={() => setFileDetailsOpen(true)}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.8)',
                    color: 'white',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.9)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    },
                    maxWidth: 180,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                />
              </Tooltip>
              <Tooltip title="Replace file in this window" placement="bottom" arrow>
                <IconButton
                  size="small"
                  onClick={onFileSelect}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  <SwapHoriz fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'medium', opacity: 0.7 }}>
              Window {windowIndex + 1}
            </Typography>
          )}
        </Box>

        {/* Right side - which array of the file to display, and close */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {selectedFile && (
            <ArrayMenuButton
              arrays={arrays}
              loading={arraysLoading}
              selectedKey={selectedArrayKey}
              onSelect={onSelectArray}
            />
          )}
          {showCloseButton && (
            <Tooltip title="Close this panel" placement="bottom" arrow>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                <Close sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'stretch'
      }}>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
          {renderBody()}
        </Box>
        {/* Controls below the plot */}
        <InlineControls
          kind={kind}
          channelIndex={channelIndex}
          sliceIndex={sliceIndex}
          metaboliteIndex={metaboliteIndex}
          measurementIndex={measurementIndex}
          labels={labels}
          setChannelIndex={setChannelIndex}
          setSliceIndex={setSliceIndex}
          setMetaboliteIndex={setMetaboliteIndex}
          setMeasurementIndex={setMeasurementIndex}
          maxChannels={hasData && isImage ? imageArray.length - 1 : 0}
          maxSlices={hasData && isImage ? (imageArray[0]?.length ?? 1) - 1 : 0}
          maxMetabolites={hasData && isImage ? (imageArray[0]?.[0]?.[0]?.[0]?.length ?? 1) - 1 : 0}
          maxMeasurements={hasData
            ? (isImage
              ? (imageArray[0]?.[0]?.[0]?.[0]?.[0]?.length ?? 1) - 1
              : (traceArray[0]?.[0]?.length ?? 1) - 1)
            : 0}
        />
      </Box>

      {/* Hover overlay for file selection */}
      {!selectedFile && isHovered && (
        <Fade in={true}>
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5
          }}>
            <Box sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.9)',
              color: 'white',
              px: 3,
              py: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <AddPhotoAlternate />
              <Typography variant="body2" fontWeight="medium">
                Click to select file
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      {/* File Details Modal */}
      <FileDetailsModal
        open={fileDetailsOpen}
        onClose={() => setFileDetailsOpen(false)}
        file={selectedFile}
      />
    </Box>
  );
};

export default ImageDisplayWindow;
