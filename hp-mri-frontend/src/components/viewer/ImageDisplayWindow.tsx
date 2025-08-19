import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Fade,
  useTheme
} from '@mui/material';
import { 
  AddPhotoAlternate, 
  ShowChart
} from '@mui/icons-material';
import ImagingPlotComponent from '../visualize/ImagingPlotComponent';
import { MRDFile } from '../../types/mrd';
import InlineControls from './InlineControls';

interface ImageDisplayWindowProps {
  windowNumber: 1 | 2 | 3;
  selectedFile: MRDFile | null;
  loading: boolean;
  error: string | null;
  imageArray: number[][][][][][];
  onFileSelect: () => void;
  onActivatePulseSource: (fileId: string) => void;
  // Control states
  channelIndex: number[];
  sliceIndex: number;
  metaboliteIndex: number;
  measurementIndex: number;
  nmrLabels: string[];
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
  windowNumber,
  selectedFile,
  loading,
  error,
  imageArray,
  onFileSelect,
  onActivatePulseSource,
  channelIndex,
  sliceIndex,
  metaboliteIndex,
  measurementIndex,
  nmrLabels,
  setChannelIndex,
  setSliceIndex,
  setMetaboliteIndex,
  setMeasurementIndex,
  alpha,
  colorScale,
  scaleByIntensity,
  showHpMriData
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPulseButtonHovered, setIsPulseButtonHovered] = useState(false);

  // Memoize the ImagingPlotComponent to prevent unnecessary re-renders
  const memoizedImagingPlot = useMemo(() => (
    <ImagingPlotComponent
      data={imageArray}
      channelIndex={[0]} // Always display 0th channel for now
      sliceIndex={sliceIndex}
      metaboliteIndex={metaboliteIndex}
      measurementIndex={measurementIndex}
      alpha={alpha}
      colorScale={colorScale}
      scaleByIntensity={scaleByIntensity}
      showHpMriData={showHpMriData}
    />
  ), [imageArray, sliceIndex, metaboliteIndex, measurementIndex, alpha, colorScale, scaleByIntensity, showHpMriData]);

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', width: '100%', height: '100%' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'white',
              gap: 2
            }}>
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
              <Typography variant="body2">Loading image data...</Typography>
            </Box>
          </Box>
          {/* Controls below image - always show even when loading */}
          <InlineControls
            channelIndex={channelIndex}
            sliceIndex={sliceIndex}
            metaboliteIndex={metaboliteIndex}
            measurementIndex={measurementIndex}
            nmrLabels={nmrLabels}
            setChannelIndex={setChannelIndex}
            setSliceIndex={setSliceIndex}
            setMetaboliteIndex={setMetaboliteIndex}
            setMeasurementIndex={setMeasurementIndex}
            maxChannels={0}
            maxSlices={0}
            maxMetabolites={0}
            maxMeasurements={0}
          />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', width: '100%', height: '100%' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#ff6b6b',
              gap: 2,
              textAlign: 'center',
              p: 2
            }}>
              <Typography variant="body2" fontWeight="medium">Error: {error}</Typography>
            </Box>
          </Box>
          {/* Controls below image - always show even with error */}
          <InlineControls
            channelIndex={channelIndex}
            sliceIndex={sliceIndex}
            metaboliteIndex={metaboliteIndex}
            measurementIndex={measurementIndex}
            nmrLabels={nmrLabels}
            setChannelIndex={setChannelIndex}
            setSliceIndex={setSliceIndex}
            setMetaboliteIndex={setMetaboliteIndex}
            setMeasurementIndex={setMeasurementIndex}
            maxChannels={0}
            maxSlices={0}
            maxMetabolites={0}
            maxMeasurements={0}
          />
        </Box>
      );
    }

    if (!imageArray || imageArray.length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', width: '100%', height: '100%' }}>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'white',
              gap: 2,
              textAlign: 'center',
              p: 2
            }}>
              <AddPhotoAlternate sx={{ fontSize: 48, opacity: 0.7 }} />
              <Typography variant="h6" fontWeight="medium">
                No Image Data
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Select an MRD file to display image data
              </Typography>
            </Box>
          </Box>
          {/* Controls below image - always show even when no image */}
          <InlineControls
            channelIndex={channelIndex}
            sliceIndex={sliceIndex}
            metaboliteIndex={metaboliteIndex}
            measurementIndex={measurementIndex}
            nmrLabels={nmrLabels}
            setChannelIndex={setChannelIndex}
            setSliceIndex={setSliceIndex}
            setMetaboliteIndex={setMetaboliteIndex}
            setMeasurementIndex={setMeasurementIndex}
            maxChannels={0}
            maxSlices={0}
            maxMetabolites={0}
            maxMeasurements={0}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'stretch', width: '100%', height: '100%' }}>
                       <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5 }}>
                 <Box sx={{ 
                   width: '100%', 
                   height: '100%', 
                   maxHeight: '100%', 
                   maxWidth: '100%', 
                   aspectRatio: '1 / 1', 
                   position: 'relative',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   <Box sx={{ 
                     position: 'absolute', 
                     inset: 0,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}>
                     {memoizedImagingPlot}
                   </Box>
                 </Box>
               </Box>
        {/* Controls below image */}
        <InlineControls
          channelIndex={channelIndex}
          sliceIndex={sliceIndex}
          metaboliteIndex={metaboliteIndex}
          measurementIndex={measurementIndex}
          nmrLabels={nmrLabels}
          setChannelIndex={setChannelIndex}
          setSliceIndex={setSliceIndex}
          setMetaboliteIndex={setMetaboliteIndex}
          setMeasurementIndex={setMeasurementIndex}
          maxChannels={(imageArray?.length ?? 1) - 1}
          maxSlices={(imageArray?.[0]?.length ?? 1) - 1}
          maxMetabolites={(imageArray?.[0]?.[0]?.[0]?.[0]?.length ?? 1) - 1}
          maxMeasurements={(imageArray?.[0]?.[0]?.[0]?.[0]?.[0]?.length ?? 1) - 1}
        />
      </Box>
    );
  };

  const handleWindowClick = () => {
    if (!selectedFile) {
      onFileSelect();
    }
  };

  const handlePulseButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFile) {
      onActivatePulseSource(selectedFile._id);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        backgroundColor: '#000',
        border: `2px solid ${isHovered || isPulseButtonHovered ? theme.palette.primary.main : '#333'}`,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        cursor: selectedFile ? 'default' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(selectedFile ? {
          // Animation when file is loaded only if pulse button is hovered
          ...(isPulseButtonHovered ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
          } : {}),
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
        alignItems: 'center'
      }}>
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'medium' }}>
          Window {windowNumber}
        </Typography>
        {selectedFile && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Chip
              label={selectedFile.fileName.substring(0, 15) + '...'}
              size="small"
              sx={{ 
                backgroundColor: 'rgba(25, 118, 210, 0.8)',
                color: 'white',
                fontSize: '0.7rem'
              }}
            />
            <IconButton
              size="small"
              onClick={handlePulseButtonClick}
              onMouseEnter={() => setIsPulseButtonHovered(true)}
              onMouseLeave={() => setIsPulseButtonHovered(false)}
              sx={{ 
                color: 'white',
                backgroundColor: 'rgba(255, 152, 0, 0.8)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.9)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                }
              }}
              title="Show pulse data"
            >
              <ShowChart fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        {renderContent()}
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
    </Box>
  );
};

export default ImageDisplayWindow;
