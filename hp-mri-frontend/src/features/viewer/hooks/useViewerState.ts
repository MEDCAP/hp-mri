import { useState, useEffect, useCallback, useMemo } from 'react';
import { MRDFile } from '../../../types/mrd';
import { listMrdFiles } from '../../../api/mrdFiles';
import { fetchMrdArrayList, fetchMrdArray } from '../../../api/viewer';
import { getApiErrorMessage } from '../../../api/client';
import {
  MrdArrayDescriptor,
  MrdArrayKind,
  MrdImageData,
  MrdTraceData,
} from '../../../api/types';

// Per-panel viewer state. Each panel holds one MRD file and one array from it.
export interface ViewerWindowState {
  selectedFile: MRDFile | null;
  /** Arrays available in the selected file, from the array list endpoint. */
  arrays: MrdArrayDescriptor[];
  arraysLoading: boolean;
  selectedArrayKey: string | null;
  /** Which of the two renderers the loaded array needs. */
  kind: MrdArrayKind;
  imageArray: MrdImageData;
  traceArray: MrdTraceData;
  labels: string[];
  valueRange: [number, number];
  channelIndex: number[];
  sliceIndex: number;
  metaboliteIndex: number;
  measurementIndex: number;
  loading: boolean;
  error: string | null;
  fileSelectorOpen: boolean;
}

// The grid never shows more than 3x2 panels, but all six states stay mounted so
// shrinking and re-growing the grid preserves each panel's file and array.
export const WINDOW_COUNT = 6;
export const MAX_COLS = 3;

/**
 * Clamp a requested layout to what the grid supports: 1-3 columns, 1-2 rows,
 * with a third row allowed only in the single-column layout.
 */
export const clampLayout = (cols: number, rows: number): { cols: number; rows: number } => {
  const clampedCols = Math.min(MAX_COLS, Math.max(1, Math.round(cols)));
  const maxRows = clampedCols === 1 ? 3 : 2;
  return { cols: clampedCols, rows: Math.min(maxRows, Math.max(1, Math.round(rows))) };
};

const createInitialWindow = (): ViewerWindowState => ({
  selectedFile: null,
  arrays: [],
  arraysLoading: false,
  selectedArrayKey: null,
  kind: 'image',
  imageArray: [],
  traceArray: [],
  labels: [],
  valueRange: [0, 0],
  channelIndex: [0],
  sliceIndex: 0,
  metaboliteIndex: 0,
  measurementIndex: 0,
  loading: false,
  error: null,
  fileSelectorOpen: false,
});

export const useViewerState = () => {
  // Per-panel viewer state (length WINDOW_COUNT)
  const [windows, setWindows] = useState<ViewerWindowState[]>(() =>
    Array.from({ length: WINDOW_COUNT }, createInitialWindow)
  );

  // Grid layout; 3x1 matches the viewer's previous fixed layout.
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(1);

  // Available MRD files
  const [availableFiles, setAvailableFiles] = useState<MRDFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Apply a partial update to a single window by index
  const updateWindow = useCallback((index: number, partial: Partial<ViewerWindowState>) => {
    setWindows(prev =>
      prev.map((win, i) => (i === index ? { ...win, ...partial } : win))
    );
  }, []);

  const setLayout = useCallback((nextCols: number, nextRows: number) => {
    const clamped = clampLayout(nextCols, nextRows);
    setCols(clamped.cols);
    setRows(clamped.rows);
  }, []);

  const visibleWindows = useMemo(
    () => windows.slice(0, cols * rows),
    [windows, cols, rows]
  );

  // Fetch MRD files list
  const fetchMRDFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const data = await listMrdFiles();
      const validFiles = data.filter((file: MRDFile) => file && file._id);
      setAvailableFiles(validFiles);
    } catch (error) {
      console.error('Error fetching MRD files:', error);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Load one named array into a panel
  const selectArray = useCallback(async (index: number, fileId: string, key: string) => {
    updateWindow(index, { loading: true, error: null, selectedArrayKey: key });

    try {
      const array = await fetchMrdArray(fileId, key);
      // Indices from the previously loaded array mean nothing for this one.
      updateWindow(index, {
        kind: array.kind,
        imageArray: array.kind === 'image' ? array.data : [],
        traceArray: array.kind === 'trace' ? array.data : [],
        labels: array.labels,
        valueRange: [array.value_min, array.value_max],
        channelIndex: [0],
        sliceIndex: 0,
        metaboliteIndex: 0,
        measurementIndex: 0,
      });
    } catch (error) {
      console.error(`Error fetching MRD array for window ${index + 1}:`, error);
      updateWindow(index, { error: `Failed to fetch array: ${getApiErrorMessage(error)}` });
    } finally {
      updateWindow(index, { loading: false });
    }
  }, [updateWindow]);

  // List the arrays in a file, then load the most useful one
  const loadArrayList = useCallback(async (fileId: string, index: number) => {
    updateWindow(index, { arraysLoading: true, error: null, arrays: [], selectedArrayKey: null });

    try {
      const { arrays } = await fetchMrdArrayList(fileId);
      updateWindow(index, { arrays, arraysLoading: false });

      if (arrays.length === 0) {
        updateWindow(index, {
          error: 'This file contains no arrays the viewer can display',
          imageArray: [],
          traceArray: [],
        });
        return;
      }

      // Prefer an image so a panel opens on something recognisable.
      const preferred = arrays.find(array => array.kind === 'image') ?? arrays[0];
      await selectArray(index, fileId, preferred.key);
    } catch (error) {
      console.error(`Error listing MRD arrays for window ${index + 1}:`, error);
      updateWindow(index, {
        arraysLoading: false,
        error: `Failed to list arrays: ${getApiErrorMessage(error)}`,
      });
    }
  }, [updateWindow, selectArray]);

  // Open/close a window's file selector dialog
  const setFileSelectorOpen = useCallback((index: number, open: boolean) => {
    updateWindow(index, { fileSelectorOpen: open });
  }, [updateWindow]);

  // Set a window's parameter control values
  const setChannelIndex = useCallback((index: number, value: number[]) => {
    updateWindow(index, { channelIndex: value });
  }, [updateWindow]);
  const setSliceIndex = useCallback((index: number, value: number) => {
    updateWindow(index, { sliceIndex: value });
  }, [updateWindow]);
  const setMetaboliteIndex = useCallback((index: number, value: number) => {
    updateWindow(index, { metaboliteIndex: value });
  }, [updateWindow]);
  const setMeasurementIndex = useCallback((index: number, value: number) => {
    updateWindow(index, { measurementIndex: value });
  }, [updateWindow]);

  // Handle file selection for a specific window (by index)
  const handleFileSelect = useCallback((file: MRDFile, index: number) => {
    updateWindow(index, {
      selectedFile: file,
      fileSelectorOpen: false,
      imageArray: [],
      traceArray: [],
      labels: [],
    });
    loadArrayList(file._id, index);
  }, [updateWindow, loadArrayList]);

  // Fetch the file list when the viewer mounts
  useEffect(() => {
    fetchMRDFiles();
  }, [fetchMRDFiles]);

  return {
    // Per-panel state
    windows,
    visibleWindows,

    // Layout
    cols, rows, setLayout,

    // Window updaters
    updateWindow,
    setFileSelectorOpen,
    setChannelIndex,
    setSliceIndex,
    setMetaboliteIndex,
    setMeasurementIndex,

    // Available files
    availableFiles, filesLoading,

    // Actions
    selectArray, handleFileSelect, fetchMRDFiles
  };
};
