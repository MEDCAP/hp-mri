/**
 * @fileoverview HomePage.tsx serves as the central interface for the HP-MRI Web Application Visualization,
 * providing functionalities such as displaying proton images, adjusting HP-MRI plots,
 * and offering navigation to the About page.
 *
 * @version 1.2.2
 * @author Benjamin Yoon
 * @date 2024-04-30
 */

import GIF from 'gif.js.optimized';
import React, { useState, useEffect, useRef } from 'react';
import './Visualization.css';
import ControlPanel from '../../components/visualize/ControlPanel';
import ButtonPanel from '../../components/visualize/ButtonPanel';
import PlotComponent from '../../components/visualize/PlotComponent';
import { Link } from 'react-router-dom';
import ImagingPlotComponent from '../../components/visualize/ImagingPlotComponent';
import PlotShiftPanel from '../../components/visualize/PlotShiftPanel';
import html2canvas from 'html2canvas';

interface Voxel {
  x: number;
  y: number;
  column: number;
  row: number;
}

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
  const [selecting, setSelecting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('A');
  // const [groupA, setGroupA] = useState([]);
  // const [groupB, setGroupB] = useState([]);
  // const plotContainerRef = useRef(null);
  const [groupA, setGroupA] = useState<Voxel[]>([]);
  const [groupB, setGroupB] = useState<Voxel[]>([]);
  const plotContainerRef = useRef<HTMLDivElement | null>(null);
  const [threshold, setThreshold] = useState(0.2); // Initial threshold value for HP MRI data filtering
  const [mode, setMode] = useState<"spectral" | "imaging" | null>(null);
  const [imagingData, setImagingData] = useState<number[][][][] | null>(null); // 4D: [rows][cols][metabolites][images]
  const [selectedMetabolite, setSelectedMetabolite] = useState(0);
  const [alpha, setAlpha] = useState(0.6);
  const [numMetabolites, setNumMetabolites] = useState(0);
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
    console.log('Frame rendered event dispatched');
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
      workerScript: '/gif.worker.js', // Assumes public/gif.worker.js
      width: 700, // Adjust as needed
      height: 540,
    });

    const frameDelay = 1000 / gifFps;

    const addFrame = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        const handler = () => {
          const targetElement = document.querySelector('.plot-container');

          if (targetElement) {
            html2canvas(targetElement as HTMLElement).then(canvas => {
              const { width, height } = canvas;
              if (width > 0 && height > 0) {
                gif.addFrame(canvas, { delay: frameDelay });
              } else {
                console.warn("Skipped frame with empty canvas");
              }
              window.removeEventListener('frameRendered', handler);
              resolve();
            });
          } else {
            resolve();
          }
        };

        // Listen for confirmation that frame has rendered
        window.addEventListener('frameRendered', handler);

        // Dispatch dataset change (PlotComponent or ImagingPlotComponent must dispatch 'frameRendered')
        const event = new CustomEvent('datasetChange', { detail: index });
        window.dispatchEvent(event);
      });
    };

    const renderFrames = async () => {
      for (let i = gifStart; i <= gifEnd; i++) {
        await addFrame(i);
      }

      // Wait a little extra to make sure the last frame is rendered
      await new Promise((resolve) => setTimeout(resolve, 100)); // wait 100ms

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = gifFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      gif.render(); // Now safe to call
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

    fetch("http://127.0.0.1:5000/visualize-api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .catch((error) => console.error("Error uploading files:", error));
  };

  const handleVoxelSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selecting || !plotContainerRef.current) return;

    const plotRect = plotContainerRef.current.getBoundingClientRect();
    const xInsidePlot = event.clientX - plotRect.left;
    const yInsidePlot = event.clientY - plotRect.top;

    if (xInsidePlot >= 0 && yInsidePlot >= 0) {
      const scaleX = hpMriData.columns / plotRect.width;
      const scaleY = hpMriData.rows / plotRect.height;
      const column = Math.floor(xInsidePlot * scaleX);
      const row = Math.floor(yInsidePlot * scaleY);

      const voxel: Voxel = { x: xInsidePlot, y: yInsidePlot, column, row };
      selectedGroup === "A" ? setGroupA([...groupA, voxel]) : setGroupB([...groupB, voxel]);
    }
  };

  // Handler for changing the threshold
  const handleThresholdChange = (event: { target: { value: React.SetStateAction<number>; }; }) => setThreshold(event.target.value);

  // Data fetch functions for proton image and HP MRI data.
  const fetchInitialData = () => {
    sendSliderValueToBackend(3, 1);
    sendDatasetToBackend(3);
  };

  const toggleSelecting = () => setSelecting(!selecting);

  const displayVoxels = (group: any[]) => group.map((voxel, index) => (
    <div key={index}>{`(X: ${voxel.x.toFixed(2)}, Y: ${voxel.y.toFixed(2)}) (Column: ${voxel.column}, Row: ${voxel.row})`}</div>
  ));

  const resetVoxels = () => {
    setGroupA([]);
    setGroupB([]);
  };

  // Function to change the magnet type
  const handleMagnetTypeChange = (newType: React.SetStateAction<string>) => {
    setMagnetType(newType);
  };

  const fetchNumSliderValues = () => {
    fetch(`http://127.0.0.1:5000/visualize-api/get_num_slider_values/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumSliderValues(data.numSliderValues);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  const fetchCountDatasets = () => {
    fetch(`http://127.0.0.1:5000/visualize-api/get_count_datasets/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumDatasets(data.numDatasets);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  // Fetches and updates the proton image based on slider input.
  const sendSliderValueToBackend = (newValue: number, newContrastValue: number) => {
    fetch(`http://127.0.0.1:5000/visualize-api/get_proton_picture/${newValue}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrast: newContrastValue, magnetType })
    }).then(response => response.blob()).then(imageBlob => setImageUrl(URL.createObjectURL(imageBlob)))
      .catch(error => console.error('Error fetching proton image:', error));
  };

  // Fetches and updates the HP MRI data plot based on slider input.
  const sendDatasetToBackend = (newDatasetIndex: React.SetStateAction<number>) => {
    const url = `http://127.0.0.1:5000/visualize-api/get_hp_mri_data/${newDatasetIndex}?threshold=${threshold}&magnetType=${magnetType}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(response => response.json())
      .then(data => setHpMriData(data))
      .catch(error => console.error('Error fetching HP MRI data:', error));
  };
  const fetchImagingMetadata = () => {
    fetch("http://127.0.0.1:5000/visualize-api/get_imaging_metadata")
      .then(res => res.json())
      .then(data => {
        setNumDatasets(data.numImages - 1);         // updates datasetIndex slider
        setNumMetabolites(data.numMetabolites); // enables metabolite selection
      });
  };
  const fetchImagingData = () => {
    fetch("http://127.0.0.1:5000/visualize-api/get_imaging_matrix")
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
    <div className="App">
      {mode === null && (
        <div className="mode-modal">
          <div className="modal-content">
            <h2>Select Imaging Mode</h2>
            <button onClick={() => setMode('spectral')}>Spectral Imaging</button>
            <button onClick={() => {
              setMode('imaging');
              fetchImagingMetadata();
              fetchImagingData();
            }}>Imaging</button>

          </div>
        </div>
      )}
      {mode && (
        <ButtonPanel
          toggleHpMriData={toggleHpMriData}
          onMoveUp={moveUp}
          onMoveLeft={moveLeft}
          onMoveDown={moveDown}
          onMoveRight={moveRight}
          onFileUpload={handleFileUpload}
          onThresholdChange={handleThresholdChange}
          onToggleSelecting={toggleSelecting}
          onSelecting={selecting}
          onSetSelectedGroup={setSelectedGroup}
          selectedGroup={selectedGroup}
          onResetVoxels={resetVoxels}
          threshold={threshold}
          onMagnetTypeChange={handleMagnetTypeChange}
          mode={mode}
          alpha={alpha}
          onAlphaChange={setAlpha}
          metabolite={selectedMetabolite}
          onMetaboliteChange={setSelectedMetabolite}
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

      <div
        className="content-wrapper"
        style={{
          marginLeft: openDrawer ? 140 : 0,
          transition: 'margin-left 0.3s ease', // smooth transition
        }}
      >
        <div className="visualization-container">
          <div className="image-and-plot-container">
            <img
              src={imageUrl}
              alt="Proton"
              className={`proton-image-${magnetType.toLowerCase().replace(" ", "-")}`}
            />

            <div className="plot-container" ref={plotContainerRef}>
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
                  magnetType={magnetType}
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

            </div>
          </div>

          {/* Image Slice + Contrast Sliders */}
          {mode && (
            <ControlPanel
              mode={mode}
              onSliderChange={handleSliderChange}
              onDatasetChange={handleDatasetChange}
              datasetIndex={datasetIndex}
              numDatasets={numDatasets}
              numSliderValues={numSliderValues}
              imageSlice={imageSlice}
              contrast={contrast}
              setImageSlice={setImageSlice}
              setContrast={setContrast}
              openDrawer={openDrawer}
            />
          )}

        </div>

        <footer>
          <Link to="/visualize-about">About</Link> • 2024 University of Pennsylvania The MEDCAP
        </footer>
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
      </div>
    </div>
  );

}

export default VisualizationPage;