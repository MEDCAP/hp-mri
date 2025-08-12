/**
 * @fileoverview ViewerPage.tsx to display mrd files as plot
 *
 */

import GIF from 'gif.js.optimized';
import React, { useState, useEffect, useRef } from 'react';
import ControlPanel from '../../components/visualize/ControlPanel';
import ButtonPanel from '../../components/visualize/ButtonPanel';
import PlotComponent from '../../components/visualize/PlotComponent';
import { Link } from 'react-router-dom';
import ImagingPlotComponent from '../../components/visualize/ImagingPlotComponent';
import PlotShiftPanel from '../../components/visualize/PlotShiftPanel';
import html2canvas from 'html2canvas';
import HeaderAccount from '../../components/HeaderAccount'; // Import HeaderAccount
import { Box } from '@mui/material';

const VisualizationPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [numSliderValues, setNumSliderValues] = useState(0);
  const [numDatasets, setNumDatasets] = useState(0);
  const [magnetType, setMagnetType] = useState('HUPC'); // Default magnet type 
  const [hpMriData, setHpMriData] = useState({
    xValues: [], data: [], columns: 0, spectralData: [], rows: 0,
    longitudinalScale: 0, perpendicularScale: 0, longitudinalMeasurement: 0, perpendicularMeasurement: 0, plotShift: [0, 0]
  });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [showHpMriData, setShowHpMriData] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [datasetIndex, setDatasetIndex] = useState(1);
  // const [groupA, setGroupA] = useState([]);
  // const [groupB, setGroupB] = useState([]);
  // const plotContainerRef = useRef(null);
  const plotContainerRef = useRef<HTMLDivElement | null>(null);
  const [threshold, setThreshold] = useState(0.2); // Initial threshold value for HP MRI data filtering
  const [mode] = useState<'imaging' | 'spectral'>('imaging');
  const [imagingData, setImagingData] = useState<number[][][][] | null>(null); // 4D: [rows][cols][metabolites][images]
  const [selectedMetabolite, setSelectedMetabolite] = useState(0);
  const [alpha, setAlpha] = useState(0.6);
  // const [numMetabolites, setNumMetabolites] = useState(0);
  const [colorScale, setColorScale] = useState<'Hot' | 'Jet' | 'B&W'>('Hot');
  const [scaleByIntensity, setScaleByIntensity] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [imageSlice, setImageSlice] = useState(9);
  const [contrast, setContrast] = useState(1);
  const [gifStart, setGifStart] = useState(1);
  const [gifEnd, setGifEnd] = useState(10);
  const [gifFps, setGifFps] = useState(2);
  const [gifFilename, setGifFilename] = useState("export.gif");

  // Effect hook for initial data fetch and window resize event listener.
  useEffect(() => {
    document.title = "Visualize - HP-MRI";
    fetchNumSliderValues();
    fetchCountDatasets();
    fetchInitialData();

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const handleDatasetChangeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      handleDatasetChange(customEvent.detail);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('datasetChange', handleDatasetChangeEvent);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('datasetChange', handleDatasetChangeEvent);
    };
  }, [magnetType]);

  // Movement Functions
  const moveUp = () => setOffsetY((prev) => prev - 1);
  const moveDown = () => setOffsetY((prev) => prev + 1);
  const moveLeft = () => setOffsetX((prev) => prev - 1);
  const moveRight = () => setOffsetX((prev) => prev + 1);
  const resetPlotShift = () => {
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleFrameRendered = () => {
    window.dispatchEvent(new Event('frameRendered'));
  };

  // Event handlers for UI control components.
  const handleSliderChange = (newValue: any, contrastValue: any) => sendSliderValueToBackend(newValue, contrastValue);
  const handleContrastChange = (sliderValue: any, newContrastValue: any) => sendSliderValueToBackend(sliderValue, newContrastValue);
  const handleDatasetChange = (newDatasetIndex: React.SetStateAction<number>) => {
    setDatasetIndex(newDatasetIndex);
    sendDatasetToBackend(newDatasetIndex);
  };

  const handleExportGif = () => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      workerScript: '/gif.worker.js',
    });

    const frameDelay = 1000 / gifFps;

    const addFrame = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        const onRendered = () => {
          window.removeEventListener('frameRendered', onRendered);

          const el = document.getElementById('visualization-root');
          if (el) {
            html2canvas(el).then(canvas => {
              const { width, height } = canvas;
              if (width === 0 || height === 0) {
                console.warn(`Skipped empty frame at index ${index}`);
                return resolve();
              }

              gif.addFrame(canvas, { delay: frameDelay });
              resolve();
            });
          }
        };

        window.addEventListener('frameRendered', onRendered);

        // Trigger dataset change
        const event = new CustomEvent('datasetChange', { detail: index });
        window.dispatchEvent(event);
      });
    };

    const renderFrames = async () => {
      for (let i = gifStart; i <= gifEnd; i++) {
        await addFrame(i);
      }

      gif.on('finished', (blob: Blob) => {
        if (blob.size === 0) {
          console.error('Empty blob. GIF generation failed.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = gifFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      gif.render();
    };

    renderFrames();
  };

  const toggleHpMriData = () => {
    setShowHpMriData(!showHpMriData);
    sendDatasetToBackend(datasetIndex);
  };

  // File upload handler.
  const handleFileUpload = (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    fetch('/api/viewer-upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .catch((error) => console.error('Error uploading files:', error));
  };

  // Handler for changing the threshold
  const handleThresholdChange = (event: { target: { value: React.SetStateAction<number>; }; }) => setThreshold(event.target.value);

  // Data fetch functions for proton image and HP MRI data.
  const fetchInitialData = () => {
    sendSliderValueToBackend(3, 1);
    sendDatasetToBackend(3);
  };

  // Function to change the magnet type
  const handleMagnetTypeChange = (newType: React.SetStateAction<string>) => {
    setMagnetType(newType);
  };

  const fetchNumSliderValues = () => {
    fetch(`/api/get_num_slider_values/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumSliderValues(data.numSliderValues);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  const fetchCountDatasets = () => {
    fetch(`/api/get_count_datasets/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumDatasets(data.numDatasets);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  // Fetches and updates the proton image based on slider input.
  const sendSliderValueToBackend = (newValue: number, newContrastValue: number) => {
    fetch(`/api/get_proton_picture/${newValue}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrast: newContrastValue, magnetType })
    }).then(response => response.blob()).then(imageBlob => setImageUrl(URL.createObjectURL(imageBlob)))
      .catch(error => console.error('Error fetching proton image:', error));
  };

  // Fetches and updates the HP MRI data plot based on slider input.
  const sendDatasetToBackend = (newDatasetIndex: React.SetStateAction<number>) => {
    const url = `/api/get_hp_mri_data/${newDatasetIndex}?threshold=${threshold}&magnetType=${magnetType}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(response => response.json())
      .then(data => setHpMriData(data))
      .catch(error => console.error('Error fetching HP MRI data:', error));
  };
  const fetchImagingMetadata = () => {
    fetch(`/api/get_imaging_metadata`)
      .then(res => res.json())
      .then(data => {
        setNumDatasets(data.numImages - 1);         // updates datasetIndex slider
        // setNumMetabolites(data.numMetabolites); // enables metabolite selection
      });
  };
  const fetchImagingData = () => {
    fetch(`/api/get_imaging_matrix`)
      .then(res => res.json())
      .then(data => {
        setImagingData(data.matrix);
      })
      .catch(err => console.error("Failed to fetch imaging matrix:", err));
  };
  const handleOpenDrawer = (tool: string) => {
    if (tool === '') {
      // Explicitly closing
      setOpenDrawer(false);
      setSelectedTool(null);
    } else if (selectedTool === tool) {
      setOpenDrawer(false);
      setSelectedTool(null);
    } else {
      // New tool selected
      setSelectedTool(tool);
      setOpenDrawer(true);
    }
  };

  return (
    <>
      <HeaderAccount background_black />
      <Box sx={{ height: 'calc(100vh - 74px)', marginTop: '74px', display: 'flex', bgcolor: '#000', overflow: 'hidden', width: '100%' }}>
        {mode && (
          <ButtonPanel
            toggleHpMriData={toggleHpMriData}
            onFileUpload={handleFileUpload}
            onThresholdChange={handleThresholdChange}
            threshold={threshold}
            onMagnetTypeChange={handleMagnetTypeChange}
            mode={mode}
            alpha={alpha}
            onAlphaChange={setAlpha}
            colorScale={colorScale}
            onColorScaleChange={setColorScale}
            scaleByIntensity={scaleByIntensity}
            onToggleScaleByIntensity={() => setScaleByIntensity(prev => !prev)}
            openDrawer={openDrawer}
            selectedTool={selectedTool}
            onOpenDrawer={handleOpenDrawer}
            onContrastChange={handleContrastChange}
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
            onExportGif={handleExportGif}
          />
        )}

        <Box
          sx={{
            position: 'relative',
            height: '100%',
            minHeight: 0,
            width: `calc(100% - ${openDrawer ? 380 : 60}px)`,
            marginLeft: `${openDrawer ? 380 : 60}px`,
            transition: 'margin-left 0.3s ease, width 0.3s ease',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              position: 'relative',
              width: '100%',
            }}
          >
            <Box id="visualization-root"
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt="Proton"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />

              <Box ref={plotContainerRef} sx={{ position: 'absolute', inset: 0 }}>
                {mode === 'spectral' && (
                  <PlotComponent
                    xValues={hpMriData.xValues}
                    data={hpMriData.data}
                    columns={hpMriData.columns}
                    spectralData={hpMriData.spectralData}
                    rows={hpMriData.rows}
                    longitudinalScale={hpMriData.longitudinalScale}
                    perpendicularScale={hpMriData.perpendicularScale}
                    longitudinalMeasurement={hpMriData.longitudinalMeasurement}
                    perpendicularMeasurement={hpMriData.perpendicularMeasurement}
                    plotShift={hpMriData.plotShift}
                    windowSize={windowSize}
                    showHpMriData={showHpMriData}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    onRendered={handleFrameRendered}
                  />
                )}

                {mode === 'imaging' && imagingData && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `calc(50% + ${offsetY + 7 * 10}px)`,  // Adjust vertical shift
                      left: `calc(50% + ${offsetX - 30 * 10}px)`, // Adjust horizontal shift
                      transform: 'translate(-50%, -50%)',
                      width: '63vw',
                      height: '49vw',
                      pointerEvents: 'none',
                    }}
                  >
                    <ImagingPlotComponent
                      data={imagingData}
                      imageIndex={datasetIndex}
                      metaboliteIndex={selectedMetabolite}
                      alpha={showHpMriData ? alpha : 0}
                      colorScale={colorScale}
                      scaleByIntensity={scaleByIntensity}
                      showHpMriData={showHpMriData}
                      onRendered={handleFrameRendered}
                    />
                  </div>
                )}

              </Box>
            </Box>

            {mode && (
              <ControlPanel
                onSliderChange={handleSliderChange}
                onDatasetChange={handleDatasetChange}
                datasetIndex={datasetIndex}
                numDatasets={numDatasets}
                numSliderValues={numSliderValues}
                imageSlice={imageSlice}
                contrast={contrast}
                setImageSlice={setImageSlice}
                openDrawer={openDrawer}
              />
            )}

          </Box>

          <Box component="footer" sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', color: '#fff', opacity: 0.8 }}>
            <Link to="/visualize-about">About</Link> • 2024 University of Pennsylvania The MEDCAP
          </Box>
          {mode && (
            <PlotShiftPanel
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onMoveLeft={moveLeft}
              onMoveRight={moveRight}
              onReset={resetPlotShift}
              mode={mode}
              metabolite={selectedMetabolite}
              onMetaboliteChange={setSelectedMetabolite}
            />
          )}
        </Box>
      </Box>
    </>
  );

}

export default VisualizationPage;