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
  Grid
} from '@mui/material';
import { ExpandMore, ExpandLess, Tune } from '@mui/icons-material';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import ImagingPlotComponent from '../../components/visualize/ImagingPlotComponent';
import ViewerSidePanel from '../../components/visualize/ViewerSidePanel';
import { MRDFile } from '../../types/mrd';

const ViewerPage: React.FC = () => {
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

  // For now, use mock data instead of the file_id
  // const file_id = '689cb3741a8a4a66e314dc22';

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
    // Fetch available MRD files on component mount
    fetchMRDFiles();
    // Remove mock data - let users select files manually
  }, []);

  // File Selector Component
  const FileSelector: React.FC<{
    open: boolean;
    onClose: () => void;
    onSelect: (file: MRDFile) => void;
    windowNumber: number;
  }> = ({ open, onClose, onSelect, windowNumber }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select MRD File for Window {windowNumber}</DialogTitle>
      <DialogContent>
        {filesLoading ? (
          <Typography>Loading files...</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Study Date</TableCell>
                  <TableCell>Owner</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableFiles.map((file) => (
                  <TableRow key={file._id} hover>
                    <TableCell>
                      <Radio
                        checked={false}
                        onChange={() => onSelect(file)}
                        value={file._id}
                      />
                    </TableCell>
                    <TableCell>{file.fileName}</TableCell>
                    <TableCell>{file.studyDate}</TableCell>
                    <TableCell>{file.ownerName}</TableCell>
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
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Parameter Controls - Window {windowNumber}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Channel Index"
                type="number"
                value={channelIndex[0]}
                onChange={(e) => setChannelIndex([parseInt(e.target.value) || 0])}
                inputProps={{ min: 0 }}
                size="small"
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
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderContent = (windowNumber: 1 | 2 | 3) => {
    const loading = windowNumber === 1 ? loading1 : windowNumber === 2 ? loading2 : loading3;
    const error = windowNumber === 1 ? error1 : windowNumber === 2 ? error2 : error3;
    const imageArray = windowNumber === 1 ? imageArray1 : windowNumber === 2 ? imageArray2 : imageArray3;
    
    // Get the appropriate parameter states for this window
    const channelIndex = windowNumber === 1 ? channelIndex1 : windowNumber === 2 ? channelIndex2 : channelIndex3;
    const sliceIndex = windowNumber === 1 ? sliceIndex1 : windowNumber === 2 ? sliceIndex2 : sliceIndex3;
    const metaboliteIndex = windowNumber === 1 ? metaboliteIndex1 : windowNumber === 2 ? metaboliteIndex2 : metaboliteIndex3;
    const measurementIndex = windowNumber === 1 ? measurementIndex1 : windowNumber === 2 ? measurementIndex2 : measurementIndex3;

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading image data...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontSize: '16px',
          color: '#d32f2f'
        }}>
          <div>Error: {error}</div>
          {/* Only show retry button if a file is selected for this window */}
          {(() => {
            const selectedFile = windowNumber === 1 ? selectedFile1 : windowNumber === 2 ? selectedFile2 : selectedFile3;
            return selectedFile ? (
              <button
                onClick={() => fetchMRDImageArray(selectedFile._id, windowNumber)}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            ) : null;
          })()}
        </div>
      );
    }

    if (!imageArray || imageArray.length === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          fontSize: '16px',
          color: '#666',
          textAlign: 'center'
        }}>
          <div>No image data loaded</div>
          <div style={{ fontSize: '14px', marginTop: '8px', color: '#999' }}>
            Click "Select File" below to choose an MRD file to visualize
          </div>
        </div>
      );
    }

    // Display metadata for debugging
    const debugInfo = imageMetadata ? (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>Window: {windowNumber}</div>
        <div>Rows: {imageMetadata.rows}</div>
        <div>Cols: {imageMetadata.columns}</div>
        <div>Metabolites: {imageMetadata.numMetabolites}</div>
        <div>Images: {imageMetadata.numImages}</div>
        <div>Data shape: {JSON.stringify(imageArray.map((d: any) => d?.length || 0))}</div>
        <div>Channel: {channelIndex[0]}, Slice: {sliceIndex}, Metabolite: {metaboliteIndex}, Measurement: {measurementIndex}</div>
      </div>
    ) : null;

    return (
      <>
        {debugInfo}
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
      </>
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
    
    // Toggle drawer closed if clicking the same tool again
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
      <div className="viewer-page-container" style={{ 
        paddingTop: '64px',
        paddingLeft: `${sidebarWidth + 60}px`, // Account for Sidebar + ViewerSidePanel (60px)
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Three Image Display Windows - Top Half */}
        <div className="image-display-row" style={{
          height: '50vh',
          width: '100%',
          display: 'flex',
          gap: '8px',
          padding: '8px',
          boxSizing: 'border-box'
        }}>
          {/* First Image Display Window */}
          <div className="image-display-window" style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#000',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div className="image-content" style={{
              width: '100%',
              height: 'calc(100% - 60px)', // Make room for buttons
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {renderContent(1)}
            </div>
            
            {/* Control Buttons for Window 1 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              height: '40px',
              alignItems: 'center'
            }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExpandMore />}
                onClick={() => setFileSelectorOpen1(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '80px'
                }}
              >
                {selectedFile1 ? selectedFile1.fileName.substring(0, 10) + '...' : 'Select File'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Tune />}
                onClick={() => setParamControlOpen1(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '60px'
                }}
              >
                Params
              </Button>
            </div>
          </div>

          {/* Second Image Display Window */}
          <div className="image-display-window" style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#000',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div className="image-content" style={{
              width: '100%',
              height: 'calc(100% - 60px)', // Make room for buttons
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {renderContent(2)}
            </div>
            
            {/* Control Buttons for Window 2 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              height: '40px',
              alignItems: 'center'
            }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExpandMore />}
                onClick={() => setFileSelectorOpen2(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '80px'
                }}
              >
                {selectedFile2 ? selectedFile2.fileName.substring(0, 10) + '...' : 'Select File'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Tune />}
                onClick={() => setParamControlOpen2(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '60px'
                }}
              >
                Params
              </Button>
            </div>
          </div>

          {/* Third Image Display Window */}
          <div className="image-display-window" style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#000',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div className="image-content" style={{
              width: '100%',
              height: 'calc(100% - 60px)', // Make room for buttons
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {renderContent(3)}
            </div>
            
            {/* Control Buttons for Window 3 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              height: '40px',
              alignItems: 'center'
            }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExpandMore />}
                onClick={() => setFileSelectorOpen3(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '80px'
                }}
              >
                {selectedFile3 ? selectedFile3.fileName.substring(0, 10) + '...' : 'Select File'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Tune />}
                onClick={() => setParamControlOpen3(true)}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  fontSize: '11px',
                  padding: '4px 8px',
                  minWidth: '60px'
                }}
              >
                Params
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Half - Available for future content */}
        <div className="bottom-panel" style={{
          height: 'calc(50vh - 32px)',
          width: '100%',
          padding: '8px',
          boxSizing: 'border-box',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '8px'
        }}>
          {/* This space can be used for spectral data, controls, or other content */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            fontSize: '16px'
          }}>
            Bottom panel available for additional content
          </div>
        </div>

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
      </div>
    </>
  );
}

export default ViewerPage;