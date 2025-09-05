import { useMemo, useCallback } from 'react';

export interface MRDDataSet {
  imageArray: number[][][][][][];
  nmrLabels: string[];
  pulseData?: number[][][];
  pulsePhase?: number[][];
  gradients?: {
    gx: number[][];
    gy: number[][];
    gz: number[][];
  };
  fileId: string;
  fileName?: string;
}

export interface ConcatenatedMRDData {
  concatenatedImageArray: number[][][][][][];
  concatenatedPulseData: number[][][] | null;
  concatenatedPulsePhase: number[][] | null;
  concatenatedGradients: {
    gx: number[][];
    gy: number[][];
    gz: number[][];
  } | null;
  combinedNmrLabels: string[];
  sourceFiles: string[];
  totalMeasurements: number;
}

export const useMRDArrayConcatenation = () => {
  
  /**
   * Concatenate multiple image arrays along the measurements dimension (axis 5)
   */
  const concatenateImageArrays = useCallback((datasets: MRDDataSet[]): number[][][][][][] => {
    const validDatasets = datasets.filter(d => d.imageArray && d.imageArray.length > 0);
    
    if (validDatasets.length === 0) return [];
    if (validDatasets.length === 1) return validDatasets[0].imageArray;

    // Get dimensions from first dataset
    const [channels, slices, rows, cols, frequencies, _] = validDatasets[0].imageArray[0]?.length ? 
      [
        validDatasets[0].imageArray.length,
        validDatasets[0].imageArray[0].length,
        validDatasets[0].imageArray[0][0].length,
        validDatasets[0].imageArray[0][0][0].length,
        validDatasets[0].imageArray[0][0][0][0].length,
        validDatasets[0].imageArray[0][0][0][0][0].length
      ] : [0, 0, 0, 0, 0, 0];

    // Validate all datasets have compatible dimensions
    const compatibleDatasets = validDatasets.filter(dataset => {
      const arr = dataset.imageArray;
      return arr.length === channels &&
             arr[0]?.length === slices &&
             arr[0]?.[0]?.length === rows &&
             arr[0]?.[0]?.[0]?.length === cols &&
             arr[0]?.[0]?.[0]?.[0]?.length === frequencies;
    });

    if (compatibleDatasets.length === 0) {
      console.warn('No compatible datasets found for concatenation');
      return validDatasets[0].imageArray;
    }

    // Concatenate along measurements dimension (axis 5)
    const result: number[][][][][][] = [];
    
    for (let c = 0; c < channels; c++) {
      result[c] = [];
      for (let s = 0; s < slices; s++) {
        result[c][s] = [];
        for (let r = 0; r < rows; r++) {
          result[c][s][r] = [];
          for (let col = 0; col < cols; col++) {
            result[c][s][r][col] = [];
            for (let f = 0; f < frequencies; f++) {
              result[c][s][r][col][f] = [];
              
              // Concatenate measurements from all datasets
              compatibleDatasets.forEach(dataset => {
                const measurements = dataset.imageArray[c][s][r][col][f];
                result[c][s][r][col][f].push(...measurements);
              });
            }
          }
        }
      }
    }

    return result;
  }, []);

  /**
   * Concatenate pulse data arrays along measurements dimension (axis 2)
   */
  const concatenatePulseArrays = useCallback((datasets: MRDDataSet[]): {
    pulseData: number[][][] | null;
    pulsePhase: number[][] | null;
  } => {
    const validDatasets = datasets.filter(d => d.pulseData && d.pulseData.length > 0);
    
    if (validDatasets.length === 0) return { pulseData: null, pulsePhase: null };
    if (validDatasets.length === 1) return {
      pulseData: validDatasets[0].pulseData || null,
      pulsePhase: validDatasets[0].pulsePhase || null
    };

    const [channels, samples] = [
      validDatasets[0].pulseData!.length,
      validDatasets[0].pulseData![0].length
    ];

    // Validate compatible dimensions
    const compatibleDatasets = validDatasets.filter(dataset => 
      dataset.pulseData!.length === channels && 
      dataset.pulseData![0].length === samples
    );

    if (compatibleDatasets.length === 0) return { pulseData: null, pulsePhase: null };

    // Concatenate pulse data
    const concatenatedPulseData: number[][][] = [];
    for (let c = 0; c < channels; c++) {
      concatenatedPulseData[c] = [];
      for (let s = 0; s < samples; s++) {
        concatenatedPulseData[c][s] = [];
        compatibleDatasets.forEach(dataset => {
          const measurements = dataset.pulseData![c][s];
          concatenatedPulseData[c][s].push(...measurements);
        });
      }
    }

    // Concatenate pulse phase if available
    let concatenatedPulsePhase: number[][] | null = null;
    if (compatibleDatasets.every(d => d.pulsePhase)) {
      concatenatedPulsePhase = [];
      for (let s = 0; s < samples; s++) {
        concatenatedPulsePhase[s] = [];
        compatibleDatasets.forEach(dataset => {
          const measurements = dataset.pulsePhase![s];
          concatenatedPulsePhase![s].push(...measurements);
        });
      }
    }

    return { pulseData: concatenatedPulseData, pulsePhase: concatenatedPulsePhase };
  }, []);

  /**
   * Concatenate gradient arrays along measurements dimension (axis 1)
   */
  const concatenateGradientArrays = useCallback((datasets: MRDDataSet[]): {
    gx: number[][];
    gy: number[][];
    gz: number[][];
  } | null => {
    const validDatasets = datasets.filter(d => d.gradients?.gx && d.gradients.gx.length > 0);
    
    if (validDatasets.length === 0) return null;
    if (validDatasets.length === 1) return validDatasets[0].gradients || null;

    const samples = validDatasets[0].gradients!.gx.length;

    // Validate compatible dimensions
    const compatibleDatasets = validDatasets.filter(dataset => 
      dataset.gradients!.gx.length === samples &&
      dataset.gradients!.gy.length === samples &&
      dataset.gradients!.gz.length === samples
    );

    if (compatibleDatasets.length === 0) return null;

    const concatenatedGradients = {
      gx: [] as number[][],
      gy: [] as number[][],
      gz: [] as number[][]
    };

    // Concatenate each gradient axis
    for (let s = 0; s < samples; s++) {
      concatenatedGradients.gx[s] = [];
      concatenatedGradients.gy[s] = [];
      concatenatedGradients.gz[s] = [];

      compatibleDatasets.forEach(dataset => {
        concatenatedGradients.gx[s].push(...dataset.gradients!.gx[s]);
        concatenatedGradients.gy[s].push(...dataset.gradients!.gy[s]);
        concatenatedGradients.gz[s].push(...dataset.gradients!.gz[s]);
      });
    }

    return concatenatedGradients;
  }, []);

  /**
   * Combine NMR labels from multiple datasets, handling duplicates
   */
  const combineNmrLabels = useCallback((datasets: MRDDataSet[]): string[] => {
    const allLabels = datasets.flatMap(d => d.nmrLabels || []);
    // Remove duplicates while preserving order
    return [...new Set(allLabels)];
  }, []);

  /**
   * Main concatenation function that combines all data types
   */
  const concatenateDatasets = useMemo(() => {
    return (datasets: MRDDataSet[]): ConcatenatedMRDData => {
      const validDatasets = datasets.filter(d => d.imageArray && d.imageArray.length > 0);
      
      if (validDatasets.length === 0) {
        return {
          concatenatedImageArray: [],
          concatenatedPulseData: null,
          concatenatedPulsePhase: null,
          concatenatedGradients: null,
          combinedNmrLabels: [],
          sourceFiles: [],
          totalMeasurements: 0
        };
      }

      // Perform concatenations
      const concatenatedImageArray = concatenateImageArrays(validDatasets);
      const { pulseData: concatenatedPulseData, pulsePhase: concatenatedPulsePhase } = concatenatePulseArrays(validDatasets);
      const concatenatedGradients = concatenateGradientArrays(validDatasets);
      const combinedNmrLabels = combineNmrLabels(validDatasets);

      // Calculate total measurements
      const totalMeasurements = validDatasets.reduce((total, dataset) => {
        const measurements = dataset.imageArray[0]?.[0]?.[0]?.[0]?.[0]?.length || 0;
        return total + measurements;
      }, 0);

      return {
        concatenatedImageArray,
        concatenatedPulseData,
        concatenatedPulsePhase,
        concatenatedGradients,
        combinedNmrLabels,
        sourceFiles: validDatasets.map(d => d.fileName || d.fileId),
        totalMeasurements
      };
    };
  }, [concatenateImageArrays, concatenatePulseArrays, concatenateGradientArrays, combineNmrLabels]);

  return {
    concatenateDatasets,
    concatenateImageArrays,
    concatenatePulseArrays,
    concatenateGradientArrays,
    combineNmrLabels
  };
}; 