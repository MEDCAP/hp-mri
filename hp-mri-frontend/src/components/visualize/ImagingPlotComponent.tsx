import React from 'react';
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
    data: number[][][][]; // [rows][cols][metabolites][images]
    imageIndex: number;
    metaboliteIndex: number;
    alpha: number; // Global alpha/opacity control (0.0 to 1.0)
    colorScale: 'Hot' | 'Jet' | 'B&W';
    scaleByIntensity: boolean; // Toggle for intensity-based scaling
    showHpMriData: boolean;
}

const ImagingPlotComponent: React.FC<Props> = ({
    data,
    imageIndex,
    metaboliteIndex,
    alpha,
    colorScale,
    scaleByIntensity,
    showHpMriData,
}) => {
    if (!data || data.length === 0 || !data[0] || data[0].length === 0) {
        console.error("Invalid data structure provided to ImagingPlotComponent");
        return <div>Error: Invalid data.</div>;
    }
    if (imageIndex < 0 || metaboliteIndex < 0 /* Add checks based on data dimensions */) {
        console.error("Invalid index provided");
        return <div>Error: Invalid index.</div>;
    }


    const rows = data.length;
    const cols = data[0].length;

    const boxWidth = 55;
    const boxHeight = 45;

    // Extract z matrix for the selected metabolite and image
    const zMatrix = data.map(row =>
        row.map(cell => {
            // Add safety checks for potentially undefined inner arrays/values
            const metaboliteData = cell?.[metaboliteIndex];
            const value = metaboliteData?.[imageIndex];
            // Return 0 or NaN if data is missing/invalid, clamp between 0 and 1
            return value === undefined || value === null || isNaN(value)
                ? 0
                : Math.max(0, Math.min(1, value)); // Ensure values are 0-1
        })
    );


    const gridShapes: Partial<Plotly.Shape>[] = [];
    // Vertical lines
    for (let i = 0; i <= cols; i++) {
        gridShapes.push({
            type: 'line', xref: 'x', yref: 'y',
            x0: i * boxWidth, x1: i * boxWidth, y0: 0, y1: rows * boxHeight,
            line: { color: 'transparent', width: 0 },
        });
    }
    // Horizontal lines
    for (let j = 0; j <= rows; j++) {
        gridShapes.push({
            type: 'line', xref: 'x', yref: 'y',
            x0: 0, x1: cols * boxWidth, y0: j * boxHeight, y1: j * boxHeight,
            line: { color: 'transparent', width: 0 },
        });
    }

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
        <Plot
            data={[
                {
                    z: zMatrix,
                    type: 'heatmap',
                    colorscale: plotColorscale, // Use the determined colorscale
                    opacity: plotOpacity,     // Use the determined opacity
                    showscale: showHpMriData,          // Show color scale bar
                    zmin: 0,                  // Explicitly set z range
                    zmax: 1,
                    // Map data indices to pixel coordinates for heatmap cells
                    x: Array.from({ length: cols }, (_, i) => i * boxWidth + boxWidth / 2),
                    y: Array.from({ length: rows }, (_, j) => j * boxHeight + boxHeight / 2),
                    hoverongaps: false, // Don't show hover info for gaps if any
                    hovertemplate: 'Row: %{y}<br>Col: %{x}<br>Value: %{z}<extra></extra>', // Customize hover
                },
            ]}
            layout={{
                width: cols * boxWidth,
                height: rows * boxHeight,
                margin: { t: 0, b: 0, l: 0, r: 0 }, // No margins
                paper_bgcolor: 'rgba(0,0,0,0)',     // Transparent background
                plot_bgcolor: 'rgba(0,0,0,0)',      // Transparent plot area
                xaxis: {
                    range: [0, cols * boxWidth], // Set x-axis range to fit cells
                    showgrid: false,
                    zeroline: false,
                    showticklabels: false,      // Hide axis ticks and labels
                    fixedrange: true,           // Prevent zooming/panning
                },
                yaxis: {
                    range: [rows * boxHeight, 0],
                    showgrid: false,
                    zeroline: false,
                    showticklabels: false,      // Hide axis ticks and labels
                    fixedrange: true,
                },
                shapes: gridShapes,             // Add the grid lines

            }}
            // Configuration options for the plot
            config={{
                staticPlot: true,
                displayModeBar: false,
            }}
        />
    );
};

export default ImagingPlotComponent;