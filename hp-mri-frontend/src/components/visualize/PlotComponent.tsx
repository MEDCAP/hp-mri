/**
 * @fileoverview PlotComponent.tsx: Enhanced layout and centering with Material UI.
 *
 * @version 2.0
 * @author Benjamin Yoon
 * @date 2025-03-02
 */

import React from "react";
import Plot from "react-plotly.js";
import { Box } from "@mui/material";

interface PlotProps {
    xValues: number[];
    data: number[];
    columns: number;
    spectralData: (string | any[])[][];
    rows: number;
    longitudinalScale: number;
    perpendicularScale: number;
    longitudinalMeasurement: number;
    perpendicularMeasurement: number;
    plotShift: number[];
    windowSize: { width: number; height: number };
    showHpMriData: boolean;
    magnetType: string;
    offsetX: number; // New prop
    offsetY: number; // New prop
}

const PlotComponent: React.FC<PlotProps> = ({
    xValues,
    data,
    columns,
    spectralData,
    rows,
    longitudinalScale,
    perpendicularScale,
    longitudinalMeasurement,
    perpendicularMeasurement,
    plotShift,
    windowSize,
    showHpMriData,
    magnetType,
    offsetX,
    offsetY,
}) => {
    const domain = calculateDomain(
        longitudinalScale,
        longitudinalMeasurement,
        plotShift[0],
        columns,
        perpendicularScale,
        perpendicularMeasurement,
        plotShift[1],
        rows
    );

    const processedData = data.map((value) => (value < 0.01 || value > 9.99 ? null : value));

    const gridData = prepareGridData(domain, columns, rows);
    const plotData = showHpMriData ? [...gridData, createLineData(xValues, processedData)] : gridData;

    const layout = configureLayout(domain, columns, spectralData, rows, windowSize, gridData);

    return (
        <Box
            sx={{
                position: "absolute", // Overlay on image
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)", // Center alignment
                width: `${63 + -offsetX}vw`,
                height: `${49 + -offsetY}vw`,
            }}
        >
            <Plot
                data={plotData}
                layout={layout}
                config={{ staticPlot: true }}
                style={{ width: "100%", height: "100%" }} // Ensures matching size
            />
        </Box>
    );

};

// Helper Functions
function calculateDomain(
    longitudinalScale: number,
    longitudinalMeasurement: number,
    plotShiftX: number,
    columns: number,
    perpendicularScale: number,
    perpendicularMeasurement: number,
    plotShiftY: number,
    rows: number
) {
    return {
        x: [
            ((longitudinalScale - longitudinalMeasurement) / 2 +
                (plotShiftX * longitudinalMeasurement) / columns) /
            longitudinalScale,
            ((longitudinalScale - longitudinalMeasurement) / 2 +
                (plotShiftX * longitudinalMeasurement) / columns) /
            longitudinalScale +
            longitudinalMeasurement / longitudinalScale,
        ],
        y: [
            ((perpendicularScale - perpendicularMeasurement) / 2 +
                (plotShiftY * perpendicularMeasurement) / rows) /
            perpendicularScale,
            ((perpendicularScale - perpendicularMeasurement) / 2 +
                (plotShiftY * perpendicularMeasurement) / rows) /
            perpendicularScale +
            perpendicularMeasurement / perpendicularScale,
        ],
    };
}

function prepareGridData(domain: { x: number[]; y: number[] }, columns: number, rows: number) {
    const gridData: any[] = [];
    for (let i = 0; i <= columns; i++) {
        gridData.push({
            type: "line",
            x0: domain.x[0] + (i / columns) * (domain.x[1] - domain.x[0]),
            y0: domain.y[0],
            x1: domain.x[0] + (i / columns) * (domain.x[1] - domain.x[0]),
            y1: domain.y[1],
            line: { color: "white", width: 1, dash: "dash" },
            xref: "paper",
            yref: "paper",
        });
    }
    for (let j = 0; j <= rows; j++) {
        gridData.push({
            type: "line",
            x0: domain.x[0],
            y0: domain.y[0] + (j / rows) * (domain.y[1] - domain.y[0]),
            x1: domain.x[1],
            y1: domain.y[0] + (j / rows) * (domain.y[1] - domain.y[0]),
            line: { color: "white", width: 1, dash: "dash" },
            xref: "paper",
            yref: "paper",
        });
    }
    return gridData;
}

function createLineData(xValues: number[], processedData: (number | null)[]) {
    return {
        x: xValues,
        y: processedData,
        type: "scatter",
        mode: "lines",
        line: { color: "#34C759", width: 1 },
        connectgaps: false,
        xaxis: "x",
        yaxis: "y",
    };
}

function configureLayout(
    domain: { x: number[]; y: number[] },
    columns: number,
    spectralData: (string | any[])[][],
    rows: number,
    windowSize: { width: number; height: number },
    gridData: any[]
) {
    // Determine the aspect ratio based on rows and columns
    const aspectRatio = columns / rows; // Ensures square cells

    return {
        showlegend: false,
        xaxis: {
            domain: domain.x,
            range: [0, spectralData.length > 0 ? columns * spectralData[0][0].length : 10],
            showgrid: false,
            zeroline: false,
            showline: false,
            showticklabels: false,
            fixedrange: true,
        },
        yaxis: {
            domain: domain.y,
            range: [0, rows],
            showgrid: false,
            zeroline: false,
            showline: false,
            showticklabels: false,
            fixedrange: true,
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
        width: windowSize.width * 0.65,
        height: windowSize.width * 0.65 / aspectRatio, // Ensures square subplots
        shapes: gridData.map((line) => ({
            ...line,
            line: { ...line.line, color: "rgba(255, 255, 255, 0.5)" },
        })),
    };
}

export default PlotComponent;
