import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MRDFile } from '../../../types/mrd';
import { listMrdFiles } from '../../../api/mrdFiles';
import { useCurrentUser } from '../../../auth/useCurrentUser';
import {
  fetchMrdArrayList,
  fetchMrdArray,
  fetchKSpace,
  fetchWaveforms,
  clearViewerCache,
} from '../../../api/viewer';
import { getApiErrorMessage } from '../../../api/client';
import { metaNumber, metaNumbers, metaString, metaStrings } from '../../../api/meta';
import {
  KSpaceResponse,
  MrdArrayDescriptor,
  MrdArrayKind,
  MrdImageData,
  MrdTraceData,
  WaveformResponse,
} from '../../../api/types';
import { concatenateImages, ConcatenationResult } from '../concatenate';

/** What a panel is showing. Most files support only 'array'. */
export type ViewKind = 'array' | 'kspace' | 'spectrum' | 'maps' | 'waveforms';

/** A voxel of a metabolite map, in tile coordinates rather than montage ones. */
export interface VoxelSelection {
  row: number;
  col: number;
}

/**
 * The arrays and meta the spectrum view draws, gathered from the several
 * arrays the fit writes: the spectrum itself, the model, and the centers.
 */
export interface SpectrumBundle {
  /** [series][sample][measurement] of the summed spectrum. */
  samples: MrdTraceData;
  transform: MrdArrayDescriptor['transform'];
  xscalePpm: number[];
  biggestPeakIndex: number | null;
  biggestPeakName: string | null;
  fitSamples: MrdTraceData | null;
  fitLoss: number | null;
  /** The fitted peak centers in ppm, one per peak. */
  centersPpm: number[] | null;
  peakNames: string[];
  /** The offsets the peaks were named by, which only the maps array carries. */
  peakOffsetsPpm: number[];
}

/** The metabolite maps and the peak names that label their rows. */
export interface MapsBundle {
  voxels: MrdImageData;
  peakNames: string[];
}

const arrayBySuffix = (
  arrays: MrdArrayDescriptor[],
  suffix: string
): MrdArrayDescriptor | null => arrays.find(array => array.name.endsWith(suffix)) ?? null;

const mapsDescriptor = (arrays: MrdArrayDescriptor[]): MrdArrayDescriptor | null =>
  arrayBySuffix(arrays, '_amplitude') ?? arrayBySuffix(arrays, '_area');

/** A 1-D array however the trace layout carried it: one series, or one sample each. */
const traceVector = (data: MrdTraceData): number[] =>
  data.length === 1
    ? data[0].map(sample => sample[0] ?? 0)
    : data.map(series => series[0]?.[0] ?? 0);

const waveformTraceCount = (waveforms: WaveformResponse): number =>
  waveforms.pulses.length + waveforms.gradients.length + waveforms.acquisitions.length;

const decideViews = (
  arrays: MrdArrayDescriptor[],
  kspace: KSpaceResponse | null,
  waveforms: WaveformResponse | null
): ViewKind[] => {
  const views: ViewKind[] = [];
  if (arrays.length > 0) views.push('array');
  if (arrayBySuffix(arrays, '_global_spect')) views.push('spectrum');
  if (mapsDescriptor(arrays)) views.push('maps');
  if (kspace) views.push('kspace');
  // acquisitions counts too: the pinned MRD fork emits no Pulse or Gradient
  // item, so gating on those two would hide the view on every real file.
  if (waveforms && waveformTraceCount(waveforms) > 0) views.push('waveforms');
  return views;
};

const loadSpectrumBundle = async (
  fileId: string,
  arrays: MrdArrayDescriptor[]
): Promise<SpectrumBundle | null> => {
  const spectrumDesc = arrayBySuffix(arrays, '_global_spect');
  if (!spectrumDesc) return null;

  const fitDesc = arrayBySuffix(arrays, '_global_spect_fit');
  const centersDesc = arrayBySuffix(arrays, '_lorentzian_centers_ppm');
  const mapsDesc = mapsDescriptor(arrays);

  const [spectrum, fit, centers] = await Promise.all([
    fetchMrdArray(fileId, spectrumDesc.key),
    fitDesc ? fetchMrdArray(fileId, fitDesc.key) : Promise.resolve(null),
    centersDesc ? fetchMrdArray(fileId, centersDesc.key) : Promise.resolve(null),
  ]);
  if (spectrum.kind !== 'trace') return null;

  return {
    samples: spectrum.data,
    transform: spectrum.transform,
    xscalePpm: metaNumbers(spectrumDesc.meta, 'xscale_ppm'),
    biggestPeakIndex: metaNumber(spectrumDesc.meta, 'biggest_peak_index'),
    biggestPeakName: metaString(spectrumDesc.meta, 'biggest_peak_name'),
    fitSamples: fit && fit.kind === 'trace' ? fit.data : null,
    fitLoss: metaNumber(fitDesc?.meta, 'fit_loss') ?? metaNumber(spectrumDesc.meta, 'fit_loss'),
    centersPpm: centers && centers.kind === 'trace' ? traceVector(centers.data) : null,
    peakNames: metaStrings(centersDesc?.meta, 'peak_names'),
    peakOffsetsPpm: metaNumbers(mapsDesc?.meta, 'peak_offsets_ppm'),
  };
};

const loadMapsBundle = async (
  fileId: string,
  arrays: MrdArrayDescriptor[]
): Promise<MapsBundle | null> => {
  const desc = mapsDescriptor(arrays);
  if (!desc) return null;

  const array = await fetchMrdArray(fileId, desc.key);
  if (array.kind !== 'image') return null;
  return { voxels: array.data, peakNames: metaStrings(desc.meta, 'peak_names') };
};

// Per-panel viewer state. Each panel holds one MRD file and one array from it.
export interface ViewerWindowState {
  selectedFile: MRDFile | null;
  /** Arrays available in the selected file, from the array list endpoint. */
  arrays: MrdArrayDescriptor[];
  arraysLoading: boolean;
  selectedArrayKey: string | null;
  /** Which view the panel is showing, and which its file supports. */
  viewKind: ViewKind;
  availableViews: ViewKind[];
  voxel: VoxelSelection | null;
  kspace: KSpaceResponse | null;
  waveforms: WaveformResponse | null;
  spectrum: SpectrumBundle | null;
  maps: MapsBundle | null;
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

/** The `_id` of the virtual file a concatenation result is shown as. */
export const CONCATENATED_FILE_ID = 'concatenated';

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
  viewKind: 'array',
  availableViews: [],
  voxel: null,
  kspace: null,
  waveforms: null,
  spectrum: null,
  maps: null,
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

const createInitialWindows = () => Array.from({ length: WINDOW_COUNT }, createInitialWindow);

/** Indices from a previously loaded array or view mean nothing for a new one. */
const resetIndices = (): Pick<
  ViewerWindowState,
  'channelIndex' | 'sliceIndex' | 'metaboliteIndex' | 'measurementIndex' | 'voxel'
> => ({
  channelIndex: [0],
  sliceIndex: 0,
  metaboliteIndex: 0,
  measurementIndex: 0,
  voxel: null,
});

export const useViewerState = () => {
  const { isSignedIn } = useCurrentUser();

  // Per-panel viewer state (length WINDOW_COUNT)
  const [windows, setWindows] = useState<ViewerWindowState[]>(createInitialWindows);

  // Grid layout. It opens on a single panel; more are added beside it.
  const [cols, setCols] = useState(1);
  const [rows, setRows] = useState(1);

  // Available MRD files
  const [availableFiles, setAvailableFiles] = useState<MRDFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Concatenation of several files' image arrays along the measurement axis
  const [concatenationFiles, setConcatenationFiles] = useState<MRDFile[]>([]);
  const [concatenation, setConcatenation] = useState<ConcatenationResult | null>(null);
  const [concatenationLoading, setConcatenationLoading] = useState(false);
  const [concatenationError, setConcatenationError] = useState<string | null>(null);

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

  /** Add a column of panels, up to MAX_COLS. */
  const addPanel = useCallback(() => {
    setLayout(cols + 1, rows);
  }, [cols, rows, setLayout]);

  /**
   * Close one panel: the panels after it move up a place and an empty one
   * takes the last slot. A single-row grid also loses the column.
   */
  const closePanel = useCallback((index: number) => {
    setWindows(prev => [...prev.slice(0, index), ...prev.slice(index + 1), createInitialWindow()]);
    if (rows === 1 && cols > 1) setLayout(cols - 1, rows);
  }, [cols, rows, setLayout]);

  // Fetch MRD files list
  const fetchMRDFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      // The backend scopes the list by the token: guests get the public group.
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
      updateWindow(index, {
        kind: array.kind,
        imageArray: array.kind === 'image' ? array.data : [],
        traceArray: array.kind === 'trace' ? array.data : [],
        labels: array.labels,
        valueRange: [array.value_min, array.value_max],
        ...resetIndices(),
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
    updateWindow(index, {
      arraysLoading: true,
      error: null,
      arrays: [],
      selectedArrayKey: null,
      availableViews: [],
      viewKind: 'array',
      kspace: null,
      waveforms: null,
      spectrum: null,
      maps: null,
    });

    try {
      // The two extra views are probed alongside the list rather than after it,
      // and neither probe failing says anything about the arrays themselves.
      const [{ arrays }, kspace, waveforms] = await Promise.all([
        fetchMrdArrayList(fileId),
        fetchKSpace(fileId).catch(() => null),
        fetchWaveforms(fileId).catch(() => null),
      ]);
      const availableViews = decideViews(arrays, kspace, waveforms);
      updateWindow(index, { arrays, arraysLoading: false, availableViews, kspace, waveforms });

      if (arrays.length === 0) {
        if (availableViews.length === 0) {
          updateWindow(index, {
            error: 'This file contains nothing the viewer can display',
            imageArray: [],
            traceArray: [],
          });
          return;
        }
        updateWindow(index, { viewKind: availableViews[0], ...resetIndices() });
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

  // Switch a panel to another view of the same file, loading what it needs
  const selectView = useCallback(async (index: number, kind: ViewKind) => {
    const win = windows[index];
    const fileId = win?.selectedFile?._id;
    updateWindow(index, { viewKind: kind, error: null, ...resetIndices() });
    if (!fileId) return;

    if (kind === 'spectrum' && !win.spectrum) {
      updateWindow(index, { loading: true });
      try {
        updateWindow(index, { spectrum: await loadSpectrumBundle(fileId, win.arrays) });
      } catch (error) {
        updateWindow(index, { error: `Failed to load spectrum: ${getApiErrorMessage(error)}` });
      } finally {
        updateWindow(index, { loading: false });
      }
      return;
    }

    if (kind === 'maps' && !win.maps) {
      updateWindow(index, { loading: true });
      try {
        updateWindow(index, { maps: await loadMapsBundle(fileId, win.arrays) });
      } catch (error) {
        updateWindow(index, { error: `Failed to load metabolite maps: ${getApiErrorMessage(error)}` });
      } finally {
        updateWindow(index, { loading: false });
      }
    }
  }, [windows, updateWindow]);

  const setVoxel = useCallback((index: number, voxel: VoxelSelection | null) => {
    updateWindow(index, { voxel });
  }, [updateWindow]);

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

  // Fetch each selected file's first image array and join them
  const performConcatenation = useCallback(async () => {
    if (concatenationFiles.length < 2) {
      setConcatenationError('At least 2 files are required for concatenation');
      return;
    }

    setConcatenationLoading(true);
    setConcatenationError(null);
    try {
      const sources = await Promise.all(concatenationFiles.map(async (file) => {
        const { arrays } = await fetchMrdArrayList(file._id);
        const image = arrays.find(array => array.kind === 'image');
        if (!image) throw new Error(`${file.fileName} has no image array`);
        const array = await fetchMrdArray(file._id, image.key);
        if (array.kind !== 'image') throw new Error(`${file.fileName} has no image array`);
        return { fileName: file.fileName, array };
      }));
      setConcatenation(concatenateImages(sources));
    } catch (error) {
      console.error('Error during concatenation:', error);
      setConcatenationError(`Concatenation failed: ${getApiErrorMessage(error)}`);
    } finally {
      setConcatenationLoading(false);
    }
  }, [concatenationFiles]);

  const loadConcatenationToWindow = useCallback((index: number) => {
    if (!concatenation) return;

    const virtualFile: MRDFile = {
      _id: CONCATENATED_FILE_ID,
      fileName: `Concatenated (${concatenation.sourceFiles.join(', ')})`,
      studyDate: new Date().toISOString().split('T')[0],
      studyTime: new Date().toTimeString().split(' ')[0],
      ownerName: 'System',
      ownerId: 'system',
      subjectType: 'Concatenated Dataset',
      groupName: 'public',
      isReconstructed: true,
      protocolName: 'Concatenated Protocol'
    };

    updateWindow(index, {
      selectedFile: virtualFile,
      arrays: [],
      arraysLoading: false,
      selectedArrayKey: null,
      viewKind: 'array',
      availableViews: [],
      kspace: null,
      waveforms: null,
      spectrum: null,
      maps: null,
      kind: 'image',
      imageArray: concatenation.data,
      traceArray: [],
      labels: concatenation.labels,
      valueRange: concatenation.valueRange,
      loading: false,
      error: null,
      ...resetIndices(),
    });
  }, [concatenation, updateWindow]);

  // The file list is scoped by the token, so it is re-fetched on sign-in,
  // sign-out and expiry. Whatever the panels hold was fetched under the other
  // identity, so they are cleared too.
  const signedInAtMount = useRef(isSignedIn);
  useEffect(() => {
    if (signedInAtMount.current !== isSignedIn) {
      signedInAtMount.current = isSignedIn;
      clearViewerCache();
      setWindows(createInitialWindows());
      setConcatenationFiles([]);
      setConcatenation(null);
      setConcatenationError(null);
    }
    fetchMRDFiles();
  }, [isSignedIn, fetchMRDFiles]);

  return {
    // Per-panel state
    windows,
    visibleWindows,

    // Layout
    cols, rows, setLayout, addPanel, closePanel,

    // Window updaters
    updateWindow,
    setFileSelectorOpen,
    setChannelIndex,
    setSliceIndex,
    setMetaboliteIndex,
    setMeasurementIndex,
    setVoxel,

    // Available files
    availableFiles, filesLoading,

    // Concatenation
    concatenationFiles, setConcatenationFiles,
    concatenation, concatenationLoading, concatenationError,
    performConcatenation, loadConcatenationToWindow,

    // Actions
    selectArray, selectView, handleFileSelect, fetchMRDFiles
  };
};
