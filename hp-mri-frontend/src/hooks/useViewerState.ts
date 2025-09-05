import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MRDFile } from '../types/mrd';
import { useMRDArrayConcatenation, MRDDataSet, ConcatenatedMRDData } from './useMRDArrayConcatenation';

export const useViewerState = () => {
  // Image data state for each window
  const [imageArray1, setImageArray1] = useState<number[][][][][][]>([]);
  const [imageArray2, setImageArray2] = useState<number[][][][][][]>([]);
  const [imageArray3, setImageArray3] = useState<number[][][][][][]>([]);
  const [nmrLabels1, setNmrLabels1] = useState<string[]>([]);
  const [nmrLabels2, setNmrLabels2] = useState<string[]>([]);
  const [nmrLabels3, setNmrLabels3] = useState<string[]>([]);
  
  // Selected file state for each window
  const [selectedFile1, setSelectedFile1] = useState<MRDFile | null>(null);
  const [selectedFile2, setSelectedFile2] = useState<MRDFile | null>(null);
  const [selectedFile3, setSelectedFile3] = useState<MRDFile | null>(null);

  // NEW: Multiple file selection for concatenation
  const [selectedFilesForConcatenation, setSelectedFilesForConcatenation] = useState<MRDFile[]>([]);
  const [concatenatedData, setConcatenatedData] = useState<ConcatenatedMRDData | null>(null);
  const [concatenationLoading, setConcatenationLoading] = useState<boolean>(false);
  const [concatenationError, setConcatenationError] = useState<string | null>(null);
  
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

  // Pulse source state
  const [pulseSourceFileId, setPulseSourceFileId] = useState<string | null>(null);

  // Initialize concatenation functionality
  const { concatenateDatasets } = useMRDArrayConcatenation();

  // Fetch MRD files list
  const fetchMRDFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const response = await axios.get('/api/mrd-files');
      const validFiles = response.data.filter((file: MRDFile) => file && file._id);
      setAvailableFiles(validFiles);
    } catch (error) {
      console.error('Error fetching MRD files:', error);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Fetch all MRD data for a file (image, pulse, gradient)
  const fetchCompleteMRDData = useCallback(async (fileId: string): Promise<MRDDataSet | null> => {
    try {
      // Fetch all data types in parallel for better performance
      const [imageResponse, pulseResponse, gradientResponse] = await Promise.allSettled([
        axios.get(`/api/viewer/${fileId}`),
        axios.get(`/api/viewer/get_pulse_array/${fileId}`),
        axios.get(`/api/viewer/get_gradient_array/${fileId}`)
      ]);

      const imageData = imageResponse.status === 'fulfilled' ? imageResponse.value.data : null;
      const pulseData = pulseResponse.status === 'fulfilled' ? pulseResponse.value.data : null;
      const gradientData = gradientResponse.status === 'fulfilled' ? gradientResponse.value.data : null;

      if (!imageData || !imageData.image_array) {
        console.warn(`No image data found for file ${fileId}`);
        return null;
      }

      // Find file name for reference
      const file = availableFiles.find(f => f._id === fileId);

      const dataset: MRDDataSet = {
        imageArray: imageData.image_array,
        nmrLabels: imageData.nmr_labels || [],
        pulseData: pulseData?.pulse_data || undefined,
        pulsePhase: pulseData?.pulse_phase || undefined,
        gradients: gradientData ? {
          gx: gradientData.gx || [],
          gy: gradientData.gy || [],
          gz: gradientData.gz || []
        } : undefined,
        fileId,
        fileName: file?.fileName || `File ${fileId}`
      };

      return dataset;
    } catch (error) {
      console.error(`Error fetching complete MRD data for file ${fileId}:`, error);
      return null;
    }
  }, [availableFiles]);

  // Fetch MRD image array for a specific window
  const fetchMRDImageArray = useCallback(async (fileId: string, windowNumber: 1 | 2 | 3) => {
    const setImageArray = windowNumber === 1 ? setImageArray1 : windowNumber === 2 ? setImageArray2 : setImageArray3;
    const setNmrLabels = windowNumber === 1 ? setNmrLabels1 : windowNumber === 2 ? setNmrLabels2 : setNmrLabels3;
    const setLoading = windowNumber === 1 ? setLoading1 : windowNumber === 2 ? setLoading2 : setLoading3;
    const setError = windowNumber === 1 ? setError1 : windowNumber === 2 ? setError2 : setError3;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/viewer/${fileId}`);
      const { image_array, nmr_labels } = response.data;

      if (image_array && Array.isArray(image_array)) {
        const imageData = image_array as number[][][][][][];
        setImageArray(imageData);
        setNmrLabels(nmr_labels || []);

        // Reset indices to 0 if they're out of bounds
        const maxMetabolites = imageData[0]?.[0]?.[0]?.[0]?.length - 1 || 0;
        
        // Note: Slice and measurement indices are handled by the optimized handlers
        const setMetaboliteIndex = windowNumber === 1 ? setMetaboliteIndex1 : windowNumber === 2 ? setMetaboliteIndex2 : setMetaboliteIndex3;
        setMetaboliteIndex(Math.min(0, maxMetabolites));
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
  }, []);

  // Handle file selection for each window
  const handleFileSelect = useCallback((file: MRDFile, windowNumber: 1 | 2 | 3) => {
    const setSelectedFile = windowNumber === 1 ? setSelectedFile1 : windowNumber === 2 ? setSelectedFile2 : setSelectedFile3;
    const setFileSelectorOpen = windowNumber === 1 ? setFileSelectorOpen1 : windowNumber === 2 ? setFileSelectorOpen2 : setFileSelectorOpen3;
    
    setSelectedFile(file);
    setFileSelectorOpen(false);
    fetchMRDImageArray(file._id, windowNumber);
    // Initialize pulse source if not set
    if (!pulseSourceFileId) {
      setPulseSourceFileId(file._id);
    }
  }, [fetchMRDImageArray, pulseSourceFileId]);

  // NEW: Handle multiple file selection for concatenation
  const handleMultipleFileSelect = useCallback((files: MRDFile[]) => {
    setSelectedFilesForConcatenation(files);
  }, []);

  // NEW: Perform concatenation of selected files
  const performConcatenation = useCallback(async () => {
    if (selectedFilesForConcatenation.length < 2) {
      setConcatenationError('At least 2 files are required for concatenation');
      return;
    }

    setConcatenationLoading(true);
    setConcatenationError(null);

    try {
      // Fetch all data for selected files
      const datasetPromises = selectedFilesForConcatenation.map(file => 
        fetchCompleteMRDData(file._id)
      );

      const datasets = await Promise.all(datasetPromises);
      const validDatasets = datasets.filter((dataset): dataset is MRDDataSet => dataset !== null);

      if (validDatasets.length < 2) {
        setConcatenationError('At least 2 valid datasets are required for concatenation');
        return;
      }

      // Perform concatenation using the custom hook
      const result = concatenateDatasets(validDatasets);
      setConcatenatedData(result);

      console.log(`Successfully concatenated ${validDatasets.length} datasets with ${result.totalMeasurements} total measurements`);
    } catch (error) {
      console.error('Error during concatenation:', error);
      setConcatenationError(`Concatenation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setConcatenationLoading(false);
    }
  }, [selectedFilesForConcatenation, fetchCompleteMRDData, concatenateDatasets]);

  // NEW: Load concatenated data into a specific window
  const loadConcatenatedDataToWindow = useCallback((windowNumber: 1 | 2 | 3) => {
    if (!concatenatedData) return;

    const setImageArray = windowNumber === 1 ? setImageArray1 : windowNumber === 2 ? setImageArray2 : setImageArray3;
    const setNmrLabels = windowNumber === 1 ? setNmrLabels1 : windowNumber === 2 ? setNmrLabels2 : setNmrLabels3;
    const setSelectedFile = windowNumber === 1 ? setSelectedFile1 : windowNumber === 2 ? setSelectedFile2 : setSelectedFile3;

    setImageArray(concatenatedData.concatenatedImageArray);
    setNmrLabels(concatenatedData.combinedNmrLabels);

    // Create a virtual file representing the concatenated data
    const virtualFile: MRDFile = {
      _id: 'concatenated',
      fileName: `Concatenated (${concatenatedData.sourceFiles.join(', ')})`,
      studyDate: new Date().toISOString().split('T')[0],
      studyTime: new Date().toTimeString().split(' ')[0],
      ownerName: 'System',
      subjectType: 'Concatenated Dataset',
      groupName: 'public',
      isReconstructed: true,
      protocolName: 'Concatenated Protocol'
    };

    setSelectedFile(virtualFile);
  }, [concatenatedData]);

  // Ensure pulse source defaults to the first available selected file
  useEffect(() => {
    if (!pulseSourceFileId) {
      const f = selectedFile1 || selectedFile2 || selectedFile3;
      if (f?._id) setPulseSourceFileId(f._id);
    }
  }, [pulseSourceFileId, selectedFile1, selectedFile2, selectedFile3]);

  // Fetch image data when component mounts
  useEffect(() => {
    fetchMRDFiles();
  }, [fetchMRDFiles]);

  return {
    // Image data
    imageArray1, imageArray2, imageArray3,
    nmrLabels1, nmrLabels2, nmrLabels3,
    
    // Selected files
    selectedFile1, selectedFile2, selectedFile3,
    
    // Loading states
    loading1, loading2, loading3,
    
    // Error states
    error1, error2, error3,
    
    // File selector states
    fileSelectorOpen1, fileSelectorOpen2, fileSelectorOpen3,
    setFileSelectorOpen1, setFileSelectorOpen2, setFileSelectorOpen3,
    
    // Available files
    availableFiles, filesLoading,
    
    // Control states
    channelIndex1, channelIndex2, channelIndex3,
    sliceIndex1, sliceIndex2, sliceIndex3,
    metaboliteIndex1, metaboliteIndex2, metaboliteIndex3,
    measurementIndex1, measurementIndex2, measurementIndex3,
    
    // Control setters
    setChannelIndex1, setChannelIndex2, setChannelIndex3,
    setSliceIndex1, setSliceIndex2, setSliceIndex3,
    setMetaboliteIndex1, setMetaboliteIndex2, setMetaboliteIndex3,
    setMeasurementIndex1, setMeasurementIndex2, setMeasurementIndex3,
    
    // Pulse source
    pulseSourceFileId, setPulseSourceFileId,

    // NEW: Concatenation functionality
    selectedFilesForConcatenation,
    concatenatedData,
    concatenationLoading,
    concatenationError,
    handleMultipleFileSelect,
    performConcatenation,
    loadConcatenatedDataToWindow,
    
    // Actions
    handleFileSelect, fetchMRDFiles
  };
};
