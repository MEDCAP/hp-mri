import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Data, Layout } from 'plotly.js';
import { Box, Typography } from '@mui/material';
import { WaveformResponse, WaveformTrace } from '../../../api/types';
import { usePlotSize } from '../hooks/usePlotSize';

const GROUP_LABELS: { key: keyof WaveformResponse; label: string }[] = [
  { key: 'pulses', label: 'pulses' },
  { key: 'gradients', label: 'gradients' },
  { key: 'acquisitions', label: 'acquisitions' },
];

interface WaveformPlotProps {
  waveforms: WaveformResponse;
}

/** Pulses, gradients and acquisitions against time, stacked on a shared axis. */
const WaveformPlotComponent: React.FC<WaveformPlotProps> = ({ waveforms }) => {
  const { containerRef, width, height } = usePlotSize();

  const groups = useMemo(
    () =>
      GROUP_LABELS.map(group => ({ ...group, traces: waveforms[group.key] })).filter(
        group => group.traces.length > 0
      ),
    [waveforms]
  );

  const plotData = useMemo<Data[]>(
    () =>
      groups.flatMap((group, row) =>
        group.traces.map((trace: WaveformTrace, index: number) => ({
          x: trace.t,
          y: trace.values,
          type: 'scatter' as const,
          mode: 'lines' as const,
          line: { width: 1 },
          name: `${group.label} ${index}`,
          xaxis: 'x',
          yaxis: row === 0 ? 'y' : `y${row + 1}`,
        }))
      ),
    [groups]
  );

  const axisTitles = useMemo<Partial<Layout>>(() => {
    const axes: Partial<Layout> = {};
    groups.forEach((group, row) => {
      const key = row === 0 ? 'yaxis' : `yaxis${row + 1}`;
      Object.assign(axes, {
        [key]: {
          title: group.label,
          showgrid: true,
          gridcolor: 'rgba(255,255,255,0.12)',
          zeroline: false,
        },
      });
    });
    return axes;
  }, [groups]);

  if (groups.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ color: '#bbb' }}>No waveforms in this file</Typography>
      </Box>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Plot
        data={plotData}
        layout={{
          width: width || undefined,
          height: height || undefined,
          margin: { l: 55, r: 10, t: 16, b: 40 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#bbb', size: 10 },
          grid: { rows: groups.length, columns: 1, pattern: 'coupled', roworder: 'top to bottom' },
          xaxis: {
            title: 'time (s)',
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.12)',
            zeroline: false,
          },
          ...axisTitles,
          showlegend: plotData.length > 1,
          legend: { orientation: 'h', y: -0.22, font: { color: '#bbb', size: 9 } },
        }}
        config={{
          displayModeBar: true,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
          toImageButtonOptions: { format: 'png', filename: 'mrd_waveforms', scale: 1 },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default WaveformPlotComponent;
