import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Data, Shape } from 'plotly.js';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { KSpaceResponse } from '../../../api/types';
import { usePlotSize } from '../hooks/usePlotSize';

const SELECT_SX = {
  width: 220,
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    height: 28,
    '& fieldset': { border: 'none' },
  },
  '& .MuiSelect-select': { color: '#fff', fontSize: '0.7rem', padding: '4px 10px' },
  '& .MuiSvgIcon-root': { color: '#bbb' },
};

const SELECT_MENU_PROPS = {
  MenuProps: {
    PaperProps: {
      sx: {
        backgroundColor: 'rgba(0,0,0,0.9)',
        border: '1px solid rgba(255,255,255,0.2)',
        '& .MuiMenuItem-root': {
          color: '#fff',
          fontSize: '0.75rem',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
          '&.Mui-selected': { backgroundColor: 'rgba(25, 118, 210, 0.3)' },
        },
      },
    },
  },
};

interface KSpacePlotProps {
  kspace: KSpaceResponse;
}

/**
 * One encoding's acquisitions folded on the gradient switch, summed over views
 * and repetitions: the aggregate a single readout is too noisy to show.
 */
const KSpacePlotComponent: React.FC<KSpacePlotProps> = ({ kspace }) => {
  const { containerRef, width, height } = usePlotSize();
  const [encodingIndex, setEncodingIndex] = useState(0);

  const encoding = kspace.encodings[Math.min(encodingIndex, kspace.encodings.length - 1)];
  const switches = encoding?.signal.length ?? 0;

  const windowEdges = useMemo(
    () =>
      encoding && encoding.kept > 0
        ? [encoding.discard_pre - 0.5, encoding.discard_pre + encoding.kept - 0.5]
        : null,
    [encoding]
  );

  const plotData = useMemo<Data[]>(() => {
    if (!encoding) return [];

    const traces: Data[] = [
      {
        z: encoding.signal,
        type: 'heatmap',
        colorscale: 'Viridis',
        zsmooth: false,
        zmin: 0,
        colorbar: { title: 'summed signal', thickness: 10 },
      },
    ];

    if (windowEdges) {
      traces.push({
        x: [windowEdges[0], windowEdges[0], null, windowEdges[1], windowEdges[1]],
        y: [0, switches - 1, null, 0, switches - 1],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(255,255,255,0.8)', width: 1.2, dash: 'dash' },
        name: `the ${encoding.kept} points the fft reads`,
      });
      traces.push({
        x: [encoding.echo, encoding.echo],
        y: [0, switches - 1],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(255,0,0,0.6)', width: 1.5 },
        name: `expected echo at ${encoding.echo}`,
      });
    }

    traces.push({
      x: encoding.brightest,
      y: encoding.brightest.map((_, s) => s),
      type: 'scatter',
      mode: 'markers',
      marker: { symbol: 'x', color: 'red', size: 5 },
      name: 'brightest sample',
    });

    return traces;
  }, [encoding, windowEdges, switches]);

  // Edges as well as a wash, so the window is legible without dimming the
  // samples inside it.
  const shapes = useMemo<Partial<Shape>[]>(
    () =>
      windowEdges
        ? [
            {
              type: 'rect',
              xref: 'x',
              yref: 'paper',
              x0: windowEdges[0],
              x1: windowEdges[1],
              y0: 0,
              y1: 1,
              fillcolor: 'rgba(255,255,255,0.12)',
              line: { width: 0 },
              layer: 'above',
            },
          ]
        : [],
    [windowEdges]
  );

  if (!encoding) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ color: '#bbb' }}>No encodings in this file</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {kspace.encodings.length > 1 && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, pb: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography variant="caption" sx={{ color: '#ddd', fontWeight: 500 }}>Encoding</Typography>
          <TextField
            select
            size="small"
            value={Math.min(encodingIndex, kspace.encodings.length - 1)}
            onChange={(e) => setEncodingIndex(Number(e.target.value))}
            sx={SELECT_SX}
            SelectProps={SELECT_MENU_PROPS}
          >
            {kspace.encodings.map((option, index) => (
              <MenuItem key={option.ref} value={index}>
                {option.name || `encoding ${option.ref}`}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
        <Plot
          data={plotData}
          layout={{
            width: width || undefined,
            height: height || undefined,
            margin: { l: 50, r: 10, t: 34, b: 40 },
            title: {
              text: `<sub>${kspace.nswitch} switches of ${encoding.total} points, discard_pre ${encoding.discard_pre}</sub>`,
              font: { size: 10, color: '#bbb' },
              x: 0.02,
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#bbb', size: 10 },
            xaxis: {
              title: `position within the ${encoding.total} point switch`,
              showgrid: false,
              zeroline: false,
            },
            yaxis: { title: 'switch', showgrid: false, zeroline: false },
            shapes,
            showlegend: true,
            legend: { orientation: 'h', y: -0.22, font: { color: '#bbb', size: 9 } },
          }}
          config={{
            displayModeBar: true,
            responsive: true,
            modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
            toImageButtonOptions: { format: 'png', filename: 'mrd_kspace', scale: 1 },
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </Box>
  );
};

export default KSpacePlotComponent;
