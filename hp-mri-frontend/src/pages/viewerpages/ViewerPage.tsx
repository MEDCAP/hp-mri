import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Radio,
  Typography,
  IconButton,
  Box,
  TextField,
  DialogActions,
  Grid,
  Fade,
  Grow,
  Zoom,
  Chip,
  Divider,
  useTheme
} from '@mui/material';

import { 
  ExpandMore, 
  Tune, 
  AddPhotoAlternate, 
  Settings,
  FileOpen,
  Close,
  CloudUpload
} from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import ImagingPlotComponent from '../../components/visualize/ImagingPlotComponent';
import ViewerSidePanel from '../../components/visualize/ViewerSidePanel';
import { MRDFile } from '../../types/mrd';

const ViewerPage: React.FC = () => {
  const theme = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Image data state for each window
  const [imageArray1, setImageArray1] = useState<number[][][][][][]>([]);
  const [imageArray2, setImageArray2] = useState<number[][][][][][]>([]);
  const [imageArray3, setImageArray3] = useState<number[][][][][][]>([]);
  
  // Selected file state for each window
  const [selectedFile1, setSelectedFile1] = useState<MRDFile | null>(null);
  const [selectedFile2, setSelectedFile2] = useState<MRDFile | null>(null);
  const [selectedFile3, setSelectedFile3] = useState<MRDFile | null>(null);
  
  // Loading states for each window
  const [loading1, setLoading1] = useState<boolean>(false);
  const [loading2, setLoading2] = useState<boolean>(false);
  const [loading3, setLoading3] = useState<boolean>(false);
  
  // Error states for each window
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);
  const [error3, setError3] = useState<string | null>(null);
  
  // File selector dialog states
  const [fileSelectorOpen1, setFileSelectorOpen1] = useState(false);
  const [fileSelectorOpen2, setFileSelectorOpen2] = useState(false);
  const [fileSelectorOpen3, setFileSelectorOpen3] = useState(false);
  
  // Available MRD files
  const [availableFiles, setAvailableFiles] = useState<MRDFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Parameter control states for each window
  const [channelIndex1, setChannelIndex1] = useState<number[]>([0]);
  const [channelIndex2, setChannelIndex2] = useState<number[]>([0]);
  const [channelIndex3, setChannelIndex3] = useState<number[]>([0]);
  
  const [sliceIndex1, setSliceIndex1] = useState<number>(0);
  const [sliceIndex2, setSliceIndex2] = useState<number>(0);
  const [sliceIndex3, setSliceIndex3] = useState<number>(0);
  
  const [metaboliteIndex1, setMetaboliteIndex1] = useState<number>(0);
  const [metaboliteIndex2, setMetaboliteIndex2] = useState<number>(0);
  const [metaboliteIndex3, setMetaboliteIndex3] = useState<number>(0);
  
  const [measurementIndex1, setMeasurementIndex1] = useState<number>(0);
  const [measurementIndex2, setMeasurementIndex2] = useState<number>(0);
  const [measurementIndex3, setMeasurementIndex3] = useState<number>(0);

  // Parameter control dialog states
  const [paramControlOpen1, setParamControlOpen1] = useState(false);
  const [paramControlOpen2, setParamControlOpen2] = useState(false);
  const [paramControlOpen3, setParamControlOpen3] = useState(false);

  const [imageMetadata, setImageMetadata] = useState<{
    rows: number;
    columns: number;
    numMetabolites: number;
    numImages: number;
  } | null>(null);

  // Side panel / visualization controls
  const [showHpMriData, setShowHpMriData] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(0.5);
  const [alpha, setAlpha] = useState<number>(0.7);
  const [colorScale, setColorScale] = useState<'Hot' | 'Jet' | 'B&W'>('Hot');
  const [scaleByIntensity, setScaleByIntensity] = useState<boolean>(false);
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageSlice, setImageSlice] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.0);
  const [gifStart, setGifStart] = useState<number>(0);
  const [gifEnd, setGifEnd] = useState<number>(0);
  const [gifFps, setGifFps] = useState<number>(10);
  const [gifFilename, setGifFilename] = useState<string>('animation.gif');

  // Fetch available MRD files
  const fetchMRDFiles = async () => {
    try {
      setFilesLoading(true);
      const response = await axios.get('/api/mrd-files');
      console.log('mrd-files response: ', response.data);
      
      // Filter out files with invalid _id
      const validFiles = response.data.filter((file: MRDFile) => {
        if (file && file._id) {
          return true;
        }
        console.warn('Filtering out invalid file object:', file);
        return false;
      });

      setAvailableFiles(validFiles);
    } catch (error) {
      console.error('Error fetching MRD files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  // Function to fetch MRD file data for a specific window
  const fetchMRDImageArray = async (file_id: string, windowNumber: 1 | 2 | 3) => {
    const setLoading = windowNumber === 1 ? setLoading1 : windowNumber === 2 ? setLoading2 : setLoading3;
    const setError = windowNumber === 1 ? setError1 : windowNumber === 2 ? setError2 : setError3;
    const setImageArray = windowNumber === 1 ? setImageArray1 : windowNumber === 2 ? setImageArray2 : setImageArray3;
    
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/viewer/${file_id}`);
      const imageData = response.data.image_array;
      const nmrLabels = response.data.nmr_labels;
      console.log(`Window ${windowNumber} imageData`, imageData);
      console.log(`Window ${windowNumber} nmrLabels`, nmrLabels);
      
      if (imageData && Array.isArray(imageData)) {
        setImageArray(imageData);
      } else {
        setError('Invalid image data format received from server');
      }
    } catch (error) {
      console.error(`Error fetching MRD image array for window ${windowNumber}:`, error);
      if (axios.isAxiosError(error)) {
        setError(`Failed to fetch image: ${error.response?.data?.error || error.message}`);
      } else {
        setError('An unexpected error occurred while fetching the image');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection for each window
  const handleFileSelect = (file: MRDFile, windowNumber: 1 | 2 | 3) => {
    const setSelectedFile = windowNumber === 1 ? setSelectedFile1 : windowNumber === 2 ? setSelectedFile2 : setSelectedFile3;
    const setFileSelectorOpen = windowNumber === 1 ? setFileSelectorOpen1 : windowNumber === 2 ? setFileSelectorOpen2 : setFileSelectorOpen3;
    
    setSelectedFile(file);
    setFileSelectorOpen(false);
    fetchMRDImageArray(file._id, windowNumber);
  };

  // Fetch image data when component mounts
  useEffect(() => {
    fetchMRDFiles();
  }, []);

  // File Selector Component
  const FileSelector: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (file: MRDFile) => void;
    windowNumber: number;
  }> = ({ open, onClose, onSelect, windowNumber }) => (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={300}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileOpen />
          <Typography variant="h6">Select MRD File for Window {windowNumber}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: theme.palette.primary.contrastText }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {filesLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading files...</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Study Date</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableFiles.map((file) => (
                  <TableRow 
                    key={file._id} 
                    hover 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onSelect(file)}
                  >
                    <TableCell padding="checkbox">
                      <Radio
                        checked={false}
                        value={file._id}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {file.fileName}
                      </Typography>
                    </TableCell>
                    <TableCell>{file.studyDate}</TableCell>
                    <TableCell>{file.ownerName}</TableCell>
                                         <TableCell>
                       <Chip 
                         label={file.file_size ? `${(Number(file.file_size) / (1024 * 1024)).toFixed(1)} MB` : 'Unknown'} 
                         size="small" 
                         variant="outlined"
                       />
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );

  // Parameter Control Component
  const ParameterControl: React.FC<{
    open: boolean;
    onClose: () => void;
    windowNumber: 1 | 2 | 3;
  }> = ({ open, onClose, windowNumber }) => {
    const getStates = (windowNum: 1 | 2 | 3) => {
      switch (windowNum) {
        case 1:
          return {
            channelIndex: channelIndex1,
            setChannelIndex: setChannelIndex1,
            sliceIndex: sliceIndex1,
            setSliceIndex: setSliceIndex1,
            metaboliteIndex: metaboliteIndex1,
            setMetaboliteIndex: setMetaboliteIndex1,
            measurementIndex: measurementIndex1,
            setMeasurementIndex: setMeasurementIndex1
          };
        case 2:
          return {
            channelIndex: channelIndex2,
            setChannelIndex: setChannelIndex2,
            sliceIndex: sliceIndex2,
            setSliceIndex: setSliceIndex2,
            metaboliteIndex: metaboliteIndex2,
            setMetaboliteIndex: setMetaboliteIndex2,
            measurementIndex: measurementIndex2,
            setMeasurementIndex: setMeasurementIndex2
          };
        case 3:
          return {
            channelIndex: channelIndex3,
            setChannelIndex: setChannelIndex3,
            sliceIndex: sliceIndex3,
            setSliceIndex: setSliceIndex3,
            metaboliteIndex: metaboliteIndex3,
            setMetaboliteIndex: setMetaboliteIndex3,
            measurementIndex: measurementIndex3,
            setMeasurementIndex: setMeasurementIndex3
          };
      }
    };

    const {
      channelIndex,
      setChannelIndex,
      sliceIndex,
      setSliceIndex,
      metaboliteIndex,
      setMetaboliteIndex,
      measurementIndex,
      setMeasurementIndex
    } = getStates(windowNumber);

    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        TransitionComponent={Zoom}
        transitionDuration={300}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          backgroundColor: theme.palette.secondary.main,
          color: theme.palette.secondary.contrastText
        }}>
          <Settings />
          <Typography variant="h6">Parameter Controls - Window {windowNumber}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Channel Index"
                type="number"
                value={channelIndex[0]}
                onChange={(e) => setChannelIndex([parseInt(e.target.value) || 0])}
                inputProps={{ min: 0 }}
                size="small"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Slice Index"
                type="number"
                value={sliceIndex}
                onChange={(e) => setSliceIndex(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
                size="small"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Metabolite Index"
                type="number"
                value={metaboliteIndex}
                onChange={(e) => setMetaboliteIndex(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
                size="small"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Measurement Index"
                type="number"
                value={measurementIndex}
                onChange={(e) => setMeasurementIndex(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
                size="small"
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={onClose} variant="contained">
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Image Display Window Component
  const ImageDisplayWindow: React.FC<{
    windowNumber: 1 | 2 | 3;
    selectedFile: MRDFile | null;
    loading: boolean;
    error: string | null;
    imageArray: number[][][][][][];
    onFileSelect: () => void;
    onParamControl: () => void;
  }> = ({ 
    windowNumber, 
    selectedFile, 
    loading, 
    error, 
    imageArray, 
    onFileSelect, 
    onParamControl 
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getStates = (windowNum: 1 | 2 | 3) => {
      switch (windowNum) {
        case 1:
          return {
            channelIndex: channelIndex1,
            sliceIndex: sliceIndex1,
            metaboliteIndex: metaboliteIndex1,
            measurementIndex: measurementIndex1
          };
        case 2:
          return {
            channelIndex: channelIndex2,
            sliceIndex: sliceIndex2,
            metaboliteIndex: metaboliteIndex2,
            measurementIndex: measurementIndex2
          };
        case 3:
          return {
            channelIndex: channelIndex3,
            sliceIndex: sliceIndex3,
            metaboliteIndex: metaboliteIndex3,
            measurementIndex: measurementIndex3
          };
      }
    };

    const { channelIndex, sliceIndex, metaboliteIndex, measurementIndex } = getStates(windowNumber);

    const renderContent = () => {
      if (loading) {
        return (
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
        );
      }

      if (error) {
        return (
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
            {selectedFile && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchMRDImageArray(selectedFile._id, windowNumber)}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Retry
              </Button>
            )}
          </Box>
        );
      }

      if (!imageArray || imageArray.length === 0) {
        return (
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
              No image data loaded
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Click anywhere in this area to select an MRD file
            </Typography>
          </Box>
        );
      }

      return (
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
      );
    };

    return (
      <Box
        sx={{
          flex: 1,
          height: '100%',
          backgroundColor: '#000',
          border: `2px solid ${isHovered ? theme.palette.primary.main : '#333'}`,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
          cursor: selectedFile ? 'default' : 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={!selectedFile ? onFileSelect : undefined}
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
            <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                onClick={onParamControl}
                sx={{ 
                  color: 'white',
                  backgroundColor: 'rgba(220, 0, 78, 0.8)',
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.main,
                  }
                }}
              >
                <Tune fontSize="small" />
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
                <CloudUpload />
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
        paddingTop: '64px',
        paddingLeft: `${sidebarWidth + 60}px`, // Account for Sidebar + ViewerSidePanel
        paddingRight: '8px',
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
        width: `calc(100vw - ${sidebarWidth + 60}px - 8px)` // Use full available width
      }}>
        {/* Top Section - Image Display Windows */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          gap: 1,
          p: 1,
          minHeight: 0 // Important for flex child
        }}>
          <ImageDisplayWindow
            windowNumber={1}
            selectedFile={selectedFile1}
            loading={loading1}
            error={error1}
            imageArray={imageArray1}
            onFileSelect={() => setFileSelectorOpen1(true)}
            onParamControl={() => setParamControlOpen1(true)}
          />
          <ImageDisplayWindow
            windowNumber={2}
            selectedFile={selectedFile2}
            loading={loading2}
            error={error2}
            imageArray={imageArray2}
            onFileSelect={() => setFileSelectorOpen2(true)}
            onParamControl={() => setParamControlOpen2(true)}
          />
          <ImageDisplayWindow
            windowNumber={3}
            selectedFile={selectedFile3}
            loading={loading3}
            error={error3}
            imageArray={imageArray3}
            onFileSelect={() => setFileSelectorOpen3(true)}
            onParamControl={() => setParamControlOpen3(true)}
          />
        </Box>

        {/* Bottom Section - Additional Content */}
        <Box sx={{
          height: '200px',
          backgroundColor: 'white',
          borderRadius: 2,
          m: 2,
          p: 3,
          boxShadow: theme.shadows[1],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography variant="h6" color="text.secondary">
            Bottom panel available for additional content
          </Typography>
        </Box>

        {/* File Selector Dialogs */}
        <FileSelector
          open={fileSelectorOpen1}
          onClose={() => setFileSelectorOpen1(false)}
          onSelect={(file) => handleFileSelect(file, 1)}
          windowNumber={1}
        />
        <FileSelector
          open={fileSelectorOpen2}
          onClose={() => setFileSelectorOpen2(false)}
          onSelect={(file) => handleFileSelect(file, 2)}
          windowNumber={2}
        />
        <FileSelector
          open={fileSelectorOpen3}
          onClose={() => setFileSelectorOpen3(false)}
          onSelect={(file) => handleFileSelect(file, 3)}
          windowNumber={3}
        />

        {/* Parameter Control Dialogs */}
        <ParameterControl
          open={paramControlOpen1}
          onClose={() => setParamControlOpen1(false)}
          windowNumber={1}
        />
        <ParameterControl
          open={paramControlOpen2}
          onClose={() => setParamControlOpen2(false)}
          windowNumber={2}
        />
        <ParameterControl
          open={paramControlOpen3}
          onClose={() => setParamControlOpen3(false)}
          windowNumber={3}
        />
      </Box>
    </>
  );
}

export default ViewerPage;