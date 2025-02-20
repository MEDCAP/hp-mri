/**
 * @fileoverview PlotComponent.tsx manages the rendering of HP MRI Visualization data plots using Plotly.js.
 *
 * @version 1.2.2
 * @author Benjamin Yoon
 * @date 2024-04-30
 */

import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js";

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
    plotShift: [number, number];
    windowSize: { width: number; height: number };
    showHpMriData: boolean;
    magnetType: string;
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
}) => {
    const plotContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        updatePlot();
    }, [
        windowSize,
        showHpMriData,
        xValues,
        data,
        columns,
        rows,
        longitudinalScale,
        perpendicularScale,
        longitudinalMeasurement,
        perpendicularMeasurement,
        plotShift,
    ]);

    const updatePlot = () => {
        try {
            if (!plotContainerRef.current) return; // Ensure ref is not null

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

            const processedData = data.map((value: number) =>
                value < 0.01 || value > 9.99 ? null : value
            );
            const gridData = prepareGridData(domain, columns, rows);
            const plotData = showHpMriData
                ? [...gridData, createLineData(xValues, processedData)]
                : gridData;

            const layout = configureLayout(domain, columns, spectralData, rows, plotContainerRef, gridData);

            Plotly.react(plotContainerRef.current, plotData, layout, { staticPlot: true });
        } catch (error) {
            console.error("Error updating plot:", error);
        }
    };

    return (
        <div
            className={`plot-container-${magnetType.toLowerCase().replace(" ", "-")}`}
            style={{ width: "100%", height: "100%" }}
        >
            <div ref={plotContainerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};

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
    plotContainerRef: React.MutableRefObject<HTMLDivElement | null>,
    gridData: any[]
) {
    return {
        showlegend: false,
        xaxis: {
            domain: domain.x,
            range: [0, columns * spectralData[0][0].length],
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
        width: plotContainerRef.current?.offsetWidth || 600, // Default width if ref is null
        height: plotContainerRef.current?.offsetHeight || 400, // Default height if ref is null
        shapes: gridData.map((line) => ({
            ...line,
            line: { ...line.line, color: "rgba(255, 255, 255, 0.5)" },
        })),
    };
}

export default PlotComponent;
