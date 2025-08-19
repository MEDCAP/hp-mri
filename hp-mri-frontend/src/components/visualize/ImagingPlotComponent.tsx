import React, { useEffect, useRef, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import * as Plotly from 'plotly.js';

const HOT_COLORS: [number, string][] = [
    [0.0, 'rgb(0,0,0)'],        // Black
    [0.11, 'rgb(105,0,0)'],     // Dark Red
    [0.22, 'rgb(210,0,0)'],     // Red
    [0.33, 'rgb(255,40,0)'],    // Orange-Red
    [0.44, 'rgb(255,150,0)'],   // Orange
    [0.55, 'rgb(255,210,0)'],   // Yellow-Orange
    [0.66, 'rgb(255,255,50)'],  // Yellow
    [0.77, 'rgb(255,255,150)'], // Light Yellow
    [0.88, 'rgb(255,255,210)'], // Very Light Yellow
    [1.0, 'rgb(255,255,255)']   // White
];

const JET_COLORS: [number, string][] = [
    [0.0, 'rgb(0,0,131)'],      // Dark Blue
    [0.125, 'rgb(0,60,170)'],   // Blue
    [0.25, 'rgb(5,255,255)'],   // Cyan
    [0.375, 'rgb(110,255,142)'],// Light Cyan-Green
    [0.5, 'rgb(255,255,0)'],    // Yellow
    [0.625, 'rgb(255,145,0)'],  // Orange
    [0.75, 'rgb(255,0,0)'],     // Red
    [0.875, 'rgb(180,0,0)'],    // Dark Red
    [1.0, 'rgb(128,0,0)']       // Darkest Red
];

const BW_COLORS: [number, string][] = [
    [0, 'rgb(0,0,0)'],          // Black
    [1, 'rgb(255,255,255)']     // White
];

// --- Helper Functions ---

/**
 * Parses an rgb() or rgba() color string.
 * @param colorString - e.g., "rgb(255,0,0)" or "rgba(0,255,0,0.5)"
 * @returns Object {r, g, b, a} or null if parsing fails. Alpha defaults to 1.
 */
const parseColor = (colorString: string): { r: number; g: number; b: number; a: number } | null => {
    const rgbMatch = colorString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10),
            a: 1.0,
        };
    }
    const rgbaMatch = colorString.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1], 10),
            g: parseInt(rgbaMatch[2], 10),
            b: parseInt(rgbaMatch[3], 10),
            a: parseFloat(rgbaMatch[4]),
        };
    }
    console.error("Could not parse color string:", colorString);
    return null;
};

/**
 * Applies a global alpha factor to a Plotly colorscale array.
 * @param scale - The base colorscale array, e.g., [[0, 'rgb(0,0,0)'], [1, 'rgb(255,255,255)']]
 * @param globalAlpha - The overall transparency factor (0.0 to 1.0)
 * @returns A new colorscale array with alpha values adjusted, or the original scale if parsing fails.
 */
const applyAlphaToColorscale = (
    scale: ReadonlyArray<[number, string]>,
    globalAlpha: number
): Array<[number, string]> => {
    return scale.map(([value, colorString]) => {
        const color = parseColor(colorString);
        if (!color) {
            return [value, colorString];
        }
        // Clamp globalAlpha between 0 and 1
        const clampedGlobalAlpha = Math.max(0, Math.min(1, globalAlpha));
        // Calculate the new alpha value
        const newAlpha = color.a * clampedGlobalAlpha;
        // Format the new color string
        const newColorString = `rgba(${color.r},${color.g},${color.b},${newAlpha.toFixed(3)})`; // Use toFixed for cleaner output
        return [value, newColorString];
    });
};

// --- Component Definition ---

interface Props {
    data: number[][][][][][]; // [channel][slice][rows][cols][metabolites][measurements]
    channelIndex: number[];   // list of multiple channels to plot
    sliceIndex: number;
    metaboliteIndex: number;
    measurementIndex: number;
    alpha: number; // Global alpha/opacity control (0.0 to 1.0)
    colorScale: 'Hot' | 'Jet' | 'B&W';
    scaleByIntensity: boolean; // Toggle for intensity-based scaling
    showHpMriData: boolean;
    onRendered?: () => void;
}

const ImagingPlotComponent: React.FC<Props> = ({
    data,
    channelIndex,
    sliceIndex,
    metaboliteIndex,
    measurementIndex,
    alpha,
    colorScale,
    scaleByIntensity,
    showHpMriData,
    onRendered,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Function to update dimensions based on container size
    const updateDimensions = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDimensions({
                width: rect.width,
                height: rect.height
            });
        }
    }, []);

    // Update dimensions on mount and window resize
    useEffect(() => {
        updateDimensions();
        
        const handleResize = () => {
            updateDimensions();
        };

        window.addEventListener('resize', handleResize);
        
        // Use ResizeObserver for more precise container size changes
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [updateDimensions]);

    // Render callback effect - must be after all other hooks
    useEffect(() => {
        if (onRendered) {
            const timer = setTimeout(() => onRendered(), 50);
            return () => clearTimeout(timer);
        }
    }, [data, channelIndex, sliceIndex, metaboliteIndex, measurementIndex, onRendered]);

    // Early returns for invalid data - must be after all hooks
    if (!data || data.length === 0 || !data[0] || data[0].length === 0) {
        console.error("Invalid data structure provided to ImagingPlotComponent");
        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>Error: Invalid data.</div>
            </div>
        );
    }
    if (sliceIndex < 0 || metaboliteIndex < 0 || measurementIndex < 0) {
        console.error("Invalid index provided");
        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>Error: Invalid index.</div>
            </div>
        );
    }

    // Extract z matrix for the selected metabolite and measurement
    // Data structure: [channel][slice][rows][cols][metabolites][measurements]
    const zMatrix: number[][] = [];
    

    
    // Get the number of rows and cols from the data dimensions
    const numRows = data[0]?.[0]?.length || 0;
    const numCols = data[0]?.[0]?.[0]?.length || 0;
    
    // Validate indices before proceeding
    const maxChannels = data.length - 1;
    const maxSlices = data[0]?.length - 1 || 0;
    const maxMetabolites = data[0]?.[0]?.[0]?.[0]?.length - 1 || 0;
    const maxMeasurements = data[0]?.[0]?.[0]?.[0]?.[0]?.length - 1 || 0;
    

    
    // Clamp indices to valid ranges
    const validChannelIndex = Math.max(0, Math.min(channelIndex[0], maxChannels));
    const validSliceIndex = Math.max(0, Math.min(sliceIndex, maxSlices));
    const validMetaboliteIndex = Math.max(0, Math.min(metaboliteIndex, maxMetabolites));
    const validMeasurementIndex = Math.max(0, Math.min(measurementIndex, maxMeasurements));
    
    // Build the zMatrix by iterating through rows and cols
    for (let row = 0; row < numRows; row++) {
        const rowData: number[] = [];
        for (let col = 0; col < numCols; col++) {
            let combinedValue = 0;
            let validChannelCount = 0;
            
            // Combine data from all selected channels
            for (const channel of channelIndex) {
                if (
                    data[channel] &&
                    data[channel][validSliceIndex] &&
                    data[channel][validSliceIndex][row] &&
                    data[channel][validSliceIndex][row][col] &&
                    data[channel][validSliceIndex][row][col][validMetaboliteIndex] &&
                    data[channel][validSliceIndex][row][col][validMetaboliteIndex][validMeasurementIndex] !== undefined
                ) {
                    const value = data[channel][validSliceIndex][row][col][validMetaboliteIndex][validMeasurementIndex];
                    if (typeof value === 'number' && !isNaN(value)) {
                        combinedValue += value;
                        validChannelCount++;
                    }
                }
            }
            
            // Calculate average if we have valid data, otherwise use 0
            const finalValue = validChannelCount > 0 ? combinedValue / validChannelCount : 0;
            

            
            rowData.push(finalValue);
        }
        zMatrix.push(rowData);
    }

    // Calculate responsive dimensions based on actual container size
    const containerWidth = dimensions.width;
    const containerHeight = dimensions.height;
    
    // If container dimensions are not available yet, show loading
    if (containerWidth === 0 || containerHeight === 0) {
        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div>Loading...</div>
            </div>
        );
    }

    // Calculate plot dimensions maintaining aspect ratio
    const dataAspectRatio = numCols / numRows;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let plotWidth: number;
    let plotHeight: number;
    
    if (dataAspectRatio > containerAspectRatio) {
        // Data is wider than container - fit to width
        plotWidth = containerWidth;
        plotHeight = containerWidth / dataAspectRatio;
    } else {
        // Data is taller than container - fit to height
        plotHeight = containerHeight;
        plotWidth = containerHeight * dataAspectRatio;
    }

    // Ensure minimum dimensions and add some padding
    const padding = 16;
    plotWidth = Math.max(plotWidth - padding, 100);
    plotHeight = Math.max(plotHeight - padding, 100);

    // Calculate cell dimensions
    // const cellWidth = plotWidth / numCols;
    // const cellHeight = plotHeight / numRows;

    // --- Determine Heatmap Trace Properties based on scaleByIntensity ---
    let plotColorscale: Plotly.ColorScale;
    let plotOpacity: number;

    // Select the base colorscale definition array
    const baseColorscaleArray =
        colorScale === 'Hot' ? HOT_COLORS :
            colorScale === 'Jet' ? JET_COLORS :
                BW_COLORS; // Default to B&W

    if (scaleByIntensity) {
        plotColorscale = applyAlphaToColorscale(baseColorscaleArray, alpha);
        plotOpacity = 1.0; // Opacity is now baked into the colorscale
    } else {
        plotColorscale =
            colorScale === 'B&W'
                ? BW_COLORS // Use array for B&W
                : colorScale; // Use name ('Hot', 'Jet') for others - Plotly handles names
        plotOpacity = alpha; // Apply global alpha uniformly
    }

    // --- Render the Plot ---
    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
            }}
        >
            <Plot
                data={[
                    {
                        z: zMatrix,
                        type: 'heatmap',
                        colorscale: plotColorscale,
                        opacity: plotOpacity,
                        showscale: showHpMriData,
                        // Let Plotly auto-scale the data range
                        // zmin: 0,
                        // zmax: 1,
                        // Use simple array indices for x and y - Plotly will handle the scaling
                        x: Array.from({ length: numCols }, (_, i) => i),
                        y: Array.from({ length: numRows }, (_, j) => j),
                        hoverongaps: false,
                        hovertemplate: 'Row: %{y}<br>Col: %{x}<br>Value: %{z}<extra></extra>',
                    },
                ]}
                layout={{
                    width: plotWidth,
                    height: plotHeight,
                    margin: { t: 0, b: 0, l: 0, r: 0 },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: {
                        showgrid: false,
                        zeroline: false,
                        showticklabels: false,
                        fixedrange: true,
                        range: [-0.5, numCols - 0.5], // Ensure full data range is visible
                    },
                    yaxis: {
                        showgrid: false,
                        zeroline: false,
                        showticklabels: false,
                        fixedrange: true,
                        range: [numRows - 0.5, -0.5], // Invert Y axis to match image coordinates
                        scaleanchor: 'x',
                        scaleratio: 1, // Maintain aspect ratio
                    },
                }}
                config={{
                    staticPlot: true,
                    displayModeBar: false,
                    responsive: false, // We handle responsiveness manually
                }}
                style={{
                    width: plotWidth,
                    height: plotHeight,
                    maxWidth: '100%',
                    maxHeight: '100%',
                }}
            />
        </div>
    );
};

export default ImagingPlotComponent;