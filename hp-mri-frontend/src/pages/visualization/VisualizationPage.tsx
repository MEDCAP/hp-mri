/**
 * @fileoverview HomePage.tsx serves as the central interface for the HP-MRI Web Application Visualization,
 * providing functionalities such as displaying proton images, adjusting HP-MRI plots,
 * and offering navigation to the About page.
 *
 * @version 1.2.2
 * @author Benjamin Yoon
 * @date 2024-04-30
 */

import React, { useState, useEffect, useRef } from 'react';
import './Visualization.css';
import ControlPanel from '../../components/visualization/ControlPanel';
import ButtonPanel from '../../components/visualization/ButtonPanel';
import PlotComponent from '../../components/visualization/PlotComponent';
import { Link } from 'react-router-dom';

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
  const [showHpMriData, setShowHpMriData] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
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
  const [offsetSelectX, setOffsetSelectX] = useState(-263); // X offset for voxel selection
  const [offsetSelectY, setOffsetSelectY] = useState(-98); // Y offset for voxel selection
  const [scaleOffsetX, setScaleOffsetX] = useState(1.335); // Scale factor for columns during selection
  const [scaleOffsetY, setScaleOffsetY] = useState(1.875); // Scale factor for rows during selection
  const [threshold, setThreshold] = useState(0.2); // Initial threshold value for HP MRI data filtering

  // Effect hook for initial data fetch and window resize event listener.
  useEffect(() => {
    fetchNumSliderValues();
    fetchCountDatasets();
    fetchInitialData();
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [magnetType]);

  // Event handlers for UI control components.
  const handleSliderChange = (newValue: any, contrastValue: any) => sendSliderValueToBackend(newValue, contrastValue);
  const handleContrastChange = (sliderValue: any, newContrastValue: any) => sendSliderValueToBackend(sliderValue, newContrastValue);
  const handleDatasetChange = (newDatasetIndex: React.SetStateAction<number>) => {
    setDatasetIndex(newDatasetIndex);
    sendDatasetToBackend(newDatasetIndex);
  };
  const toggleHpMriData = () => {
    setShowHpMriData(!showHpMriData);
    sendDatasetToBackend(datasetIndex);
  };

  // Event handlers for plot position adjustment.
  const moveLeft = () => setOffsetX(offsetX - 1);
  const moveRight = () => setOffsetX(offsetX + 1);
  const moveUp = () => setOffsetY(offsetY - 1);
  const moveDown = () => setOffsetY(offsetY + 1);
  const resetPlotShift = () => {
    setOffsetX(0);
    setOffsetY(0);
  };

  // File upload handler.
  const handleFileUpload = (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));

    fetch("http://127.0.0.1:5000/api/upload", {
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
    fetch(`http://127.0.0.1:5000/api/get_num_slider_values/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumSliderValues(data.numSliderValues);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  const fetchCountDatasets = () => {
    fetch(`http://127.0.0.1:5000/api/get_count_datasets/${magnetType}`)
      .then(response => response.json())
      .then(data => {
        setNumDatasets(data.numDatasets);
      })
      .catch(error => console.error('Failed to fetch number of slider values:', error));
  };

  // Fetches and updates the proton image based on slider input.
  const sendSliderValueToBackend = (newValue: number, newContrastValue: number) => {
    fetch(`http://127.0.0.1:5000/api/get_proton_picture/${newValue}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrast: newContrastValue, magnetType })
    }).then(response => response.blob()).then(imageBlob => setImageUrl(URL.createObjectURL(imageBlob)))
      .catch(error => console.error('Error fetching proton image:', error));
  };

  // Fetches and updates the HP MRI data plot based on slider input.
  const sendDatasetToBackend = (newDatasetIndex: React.SetStateAction<number>) => {
    const url = `http://127.0.0.1:5000/api/get_hp_mri_data/${newDatasetIndex}?threshold=${threshold}&magnetType=${magnetType}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(response => response.json())
      .then(data => setHpMriData(data))
      .catch(error => console.error('Error fetching HP MRI data:', error));
  };

  // Render the HomePage component.
  return (
    <div className="App">
      <div className="top-panel">
        <ButtonPanel
          toggleHpMriData={toggleHpMriData}
          onMoveUp={moveUp}
          onMoveLeft={moveLeft}
          onMoveDown={moveDown}
          onMoveRight={moveRight}
          onResetPlotShift={resetPlotShift}
          onFileUpload={handleFileUpload}
          onThresholdChange={handleThresholdChange}
          onToggleSelecting={toggleSelecting}
          onSelecting={selecting}
          onSetSelectedGroup={setSelectedGroup}
          selectedGroup={selectedGroup}
          onResetVoxels={resetVoxels}
          threshold={threshold}
          onMagnetTypeChange={handleMagnetTypeChange}
        />
      </div>
      <ControlPanel
        onSliderChange={handleSliderChange}
        numSliderValues={numSliderValues}
        onContrastChange={handleContrastChange}
        onDatasetChange={handleDatasetChange}
        datasetIndex={datasetIndex}
        numDatasets={numDatasets}
      />
      <div className="image-and-plot-container" onClick={handleVoxelSelect}>
        <div className="app-content">
        </div>
        <img src={imageUrl}
          alt="Proton"
          className={`proton-image-${magnetType.toLowerCase().replace(" ", "-")}`}
        />
        <div className={`plot-container-${magnetType.toLowerCase().replace(" ", "-")}`} ref={plotContainerRef} style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}>
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
          />
        </div>
        {selecting && (
          <div className="voxel-display">
            <h3>Group A</h3>
            {displayVoxels(groupA)}
            <h3>Group B</h3>
            {displayVoxels(groupB)}
          </div>
        )}
      </div>
      <footer>
        <Link to="/about">About</Link> • 2024 Universty of Pennsylvania Perelman School of Medicine
      </footer>
    </div>
  );
}

export default VisualizationPage;