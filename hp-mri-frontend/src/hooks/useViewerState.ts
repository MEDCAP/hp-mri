import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MRDFile } from '../types/mrd';
import { useMRDArrayConcatenation, MRDDataSet, ConcatenatedMRDData } from './useMRDArrayConcatenation';
import { isAuthenticated } from '../pages/loginpages/cognitoUtils';

export interface WindowState {
  imageArray: number[][][][][][];
  nmrLabels: string[];
  selectedFile: MRDFile | null;
  loading: boolean;
  error: string | null;
  fileSelectorOpen: boolean;
  channelIndex: number[];
  sliceIndex: number;
  metaboliteIndex: number;
  measurementIndex: number;
}

export const MAX_WINDOWS = 3;

export const createInitialWindowState = (): WindowState => ({
  imageArray: [],
  nmrLabels: [],
  selectedFile: null,
  loading: false,
  error: null,
  fileSelectorOpen: false,
  channelIndex: [0],
  sliceIndex: 0,
  metaboliteIndex: 0,
  measurementIndex: 0,
});

export const useViewerState = () => {
  const [windows, setWindows] = useState<WindowState[]>(
    Array.from({ length: MAX_WINDOWS }, createInitialWindowState)
  );

  const [availableFiles, setAvailableFiles] = useState<MRDFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const [selectedFilesForConcatenation, setSelectedFilesForConcatenation] = useState<MRDFile[]>([]);
  const [concatenatedData, setConcatenatedData] = useState<ConcatenatedMRDData | null>(null);
  const [concatenationLoading, setConcatenationLoading] = useState<boolean>(false);
  const [concatenationError, setConcatenationError] = useState<string | null>(null);

  const [pulseSourceFileId, setPulseSourceFileId] = useState<string | null>(null);

  const { concatenateDatasets } = useMRDArrayConcatenation();

  const updateWindow = useCallback((index: number, patch: Partial<WindowState>) => {
    setWindows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const fetchMRDFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      // Authenticated users see all their accessible files; guests see only public files
      const endpoint = isAuthenticated() ? '/api/mrd-files' : '/api/mrd-files/public';
      const response = await axios.get(endpoint);
      const validFiles = response.data.filter((file: MRDFile) => file && file._id);
      setAvailableFiles(validFiles);
    } catch (error) {
      console.error('Error fetching MRD files:', error);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  const fetchCompleteMRDData = useCallback(async (fileId: string): Promise<MRDDataSet | null> => {
    try {
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

      const file = availableFiles.find(f => f._id === fileId);

      return {
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
    } catch (error) {
      console.error(`Error fetching complete MRD data for file ${fileId}:`, error);
      return null;
    }
  }, [availableFiles]);

  const fetchMRDImageArray = useCallback(async (fileId: string, windowIndex: number) => {
    updateWindow(windowIndex, { loading: true, error: null });
    try {
      const response = await axios.get(`/api/viewer/${fileId}`);
      const { image_array, nmr_labels } = response.data;

      if (image_array && Array.isArray(image_array)) {
        updateWindow(windowIndex, {
          imageArray: image_array as number[][][][][][],
          nmrLabels: nmr_labels || [],
          metaboliteIndex: 0,
          loading: false,
        });
      } else {
        updateWindow(windowIndex, { error: 'Invalid image data format received from server', loading: false });
      }
    } catch (error) {
      console.error(`Error fetching MRD image array for window ${windowIndex}:`, error);
      const msg = axios.isAxiosError(error)
        ? `Failed to fetch image: ${error.response?.data?.error || error.message}`
        : 'An unexpected error occurred while fetching the image';
      updateWindow(windowIndex, { error: msg, loading: false });
    }
  }, [updateWindow]);

  const handleFileSelect = useCallback((file: MRDFile, windowIndex: number) => {
    updateWindow(windowIndex, { selectedFile: file, fileSelectorOpen: false });
    fetchMRDImageArray(file._id, windowIndex);
    if (!pulseSourceFileId) {
      setPulseSourceFileId(file._id);
    }
  }, [updateWindow, fetchMRDImageArray, pulseSourceFileId]);

  const handleMultipleFileSelect = useCallback((files: MRDFile[]) => {
    setSelectedFilesForConcatenation(files);
  }, []);

  const performConcatenation = useCallback(async () => {
    if (selectedFilesForConcatenation.length < 2) {
      setConcatenationError('At least 2 files are required for concatenation');
      return;
    }

    setConcatenationLoading(true);
    setConcatenationError(null);

    try {
      const datasetPromises = selectedFilesForConcatenation.map(file =>
        fetchCompleteMRDData(file._id)
      );

      const datasets = await Promise.all(datasetPromises);
      const validDatasets = datasets.filter((dataset): dataset is MRDDataSet => dataset !== null);

      if (validDatasets.length < 2) {
        setConcatenationError('At least 2 valid datasets are required for concatenation');
        return;
      }

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

  const loadConcatenatedDataToWindow = useCallback((windowIndex: number) => {
    if (!concatenatedData) return;

    const virtualFile: MRDFile = {
      _id: 'concatenated',
      fileName: `Concatenated (${concatenatedData.sourceFiles.join(', ')})`,
      studyDate: new Date().toISOString().split('T')[0],
      studyTime: new Date().toTimeString().split(' ')[0],
      ownerName: 'System',
      ownerId: 'system',
      subjectType: 'Concatenated Dataset',
      groupName: 'public',
      isReconstructed: true,
      protocolName: 'Concatenated Protocol'
    };

    updateWindow(windowIndex, {
      imageArray: concatenatedData.concatenatedImageArray,
      nmrLabels: concatenatedData.combinedNmrLabels,
      selectedFile: virtualFile,
    });
  }, [concatenatedData, updateWindow]);

  useEffect(() => {
    if (!pulseSourceFileId) {
      const f = windows.find(w => w.selectedFile?._id)?.selectedFile;
      if (f?._id) setPulseSourceFileId(f._id);
    }
  }, [pulseSourceFileId, windows]);

  useEffect(() => {
    fetchMRDFiles();
  }, [fetchMRDFiles]);

  return {
    windows,
    setWindows,
    updateWindow,
    pulseSourceFileId,
    setPulseSourceFileId,
    availableFiles,
    filesLoading,
    selectedFilesForConcatenation,
    concatenatedData,
    concatenationLoading,
    concatenationError,
    handleMultipleFileSelect,
    performConcatenation,
    loadConcatenatedDataToWindow,
    handleFileSelect,
    fetchMRDFiles,
  };
};
