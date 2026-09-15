import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Plot from 'react-plotly.js';
import { Data } from 'plotly.js';
import { Box, Typography } from '@mui/material';
import { MrdTraceData } from '../../../api/types';

interface TracePlotProps {
  /** [series][sample][measurement] */
  data: MrdTraceData;
  measurementIndex: number;
}

/**
 * Line renderer for MRD arrays that are not images — spectra, pulses, waveforms.
 * Purely presentational: the panel owns fetching and the measurement index.
 */
const TracePlotComponent: React.FC<TracePlotProps> = ({ data, measurementIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Plotly's own resize handling only watches the window, so changing the panel
  // grid would leave the plot at its old size. Measure the container instead.
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  const plotData = useMemo<Data[]>(() => {
    return (data || []).map((series, index) => {
      const y = (series || []).map(samples => samples?.[measurementIndex] ?? 0);
      return {
        x: y.map((_, sample) => sample),
        y,
        type: 'scatter',
        mode: 'lines',
        line: { width: 1.5 },
        name: `Series ${index + 1}`,
      };
    });
  }, [data, measurementIndex]);

  const hasData = plotData.length > 0 && plotData.some(trace => (trace as { y?: number[] }).y?.length);

  if (!hasData) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ color: '#bbb' }}>No data in this array</Typography>
      </Box>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
    <Plot
      data={plotData}
      layout={{
        width: dimensions.width || undefined,
        height: dimensions.height || undefined,
        margin: { l: 45, r: 10, t: 10, b: 30 },
        // The plot now sits inside a black panel rather than the old white
        // bottom row, so let the panel background show through.
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#bbb', size: 10 },
        xaxis: { title: 'Sample', showgrid: true, gridcolor: 'rgba(255,255,255,0.12)', zeroline: false },
        yaxis: { title: 'Value', showgrid: true, gridcolor: 'rgba(255,255,255,0.12)', zeroline: false },
        showlegend: plotData.length > 1,
        legend: { orientation: 'h', y: -0.2, font: { color: '#bbb' } },
      }}
      config={{
        displayModeBar: true,
        responsive: true,
        modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
        toImageButtonOptions: { format: 'png', filename: 'mrd_trace', scale: 1 },
      }}
      style={{ width: '100%', height: '100%' }}
    />
    </div>
  );
};

export default TracePlotComponent;
