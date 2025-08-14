import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import ImagingPlotComponent from '../../components/visualize/ImagingPlotComponent';

const ViewerPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Using 4D mock data structure: [channels][slices][rows][cols][metabolites][measurements]
  const [imageArray, setImageArray] = useState<number[][][][][][]>([]); 
  const [imageMetadata, setImageMetadata] = useState<{
    rows: number;
    columns: number;
    numMetabolites: number;
    numImages: number;
  } | null>(null);
  
  // For now, use mock data instead of the file_id
  // const file_id = '689cb3741a8a4a66e314dc22';

  // Fetch mock imaging data for testing
  const fetchMockImageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get metadata
      const metadataResponse = await axios.get('/api/get_imaging_metadata');
      const metadata = metadataResponse.data;
      setImageMetadata(metadata);
      
      // Then get the actual imaging matrix
      const imageResponse = await axios.get('/api/get_imaging_matrix');
      const imageData = imageResponse.data.matrix;
      
      if (imageData && Array.isArray(imageData)) {
        setImageArray(imageData);
      } else {
        setError('Invalid image data format received from server');
      }
    } catch (error) {
      console.error('Error fetching mock image data:', error);
      if (axios.isAxiosError(error)) {
        setError(`Failed to fetch image: ${error.response?.data?.error || error.message}`);
      } else {
        setError('An unexpected error occurred while fetching the image');
      }
    } finally {
      setLoading(false);
    }
  };

  // Alternative function for MRD file data (keeping for future use)
  const fetchMRDImageArray = async (file_id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/viewer/${file_id}`);
      
      // Backend returns {image_array: data}, so we need response.data.image_array
      const imageData = response.data.image_array;
      
      if (imageData && Array.isArray(imageData)) {
        // MRD data is 4D: [channel, slice, y, x]
        // We need to transform it to match what the component expects
        // For now, just set it and see what happens
        setImageArray(imageData);
      } else {
        setError('Invalid image data format received from server');
      }
    } catch (error) {
      console.error('Error fetching MRD image array:', error);
      if (axios.isAxiosError(error)) {
        setError(`Failed to fetch image: ${error.response?.data?.error || error.message}`);
      } else {
        setError('An unexpected error occurred while fetching the image');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch image data when component mounts
  useEffect(() => {
    // Use mock data for now
    fetchMockImageData();
    
    // Uncomment this to try MRD file data instead:
    // fetchMRDImageArray(file_id);
  }, []);

  const renderContent = () => {
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
          <button 
            onClick={() => fetchMockImageData()}
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
        </div>
      );
    }

    if (!imageArray || imageArray.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          fontSize: '16px',
          color: '#666'
        }}>
          No image data available
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
        <div>Rows: {imageMetadata.rows}</div>
        <div>Cols: {imageMetadata.columns}</div>
        <div>Metabolites: {imageMetadata.numMetabolites}</div>
        <div>Images: {imageMetadata.numImages}</div>
        <div>Data shape: {JSON.stringify(imageArray.map(d => d?.length || 0))}</div>
      </div>
    ) : null;

    return (
      <>
        {debugInfo}
        <ImagingPlotComponent
          data={imageArray}
          channelIndex={[0]}
          sliceIndex={0}
          metaboliteIndex={0}
          measurementIndex={0}
          imageIndex={0} // For 4D data, this selects which image from the series
          alpha={0.7}
          colorScale="Hot"
          scaleByIntensity={false}
          showHpMriData={true}
        />
      </>
    );
  };

  return (
    <>
      <HeaderAccount background_black />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} background_black/>
      <div className="viewer-page-container" style={{ paddingTop: '64px' }}>
        <div className="image-container"
          style={{
            position: 'relative',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '63vw',
            height: '49vw',
            pointerEvents: 'none',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </>
  );
}

export default ViewerPage;