import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Data, PlotMouseEvent } from 'plotly.js';
import { Box, Typography } from '@mui/material';
import { MrdImageData } from '../../../api/types';
import { MapsBundle, VoxelSelection } from '../hooks/useViewerState';
import { usePlotSize } from '../hooks/usePlotSize';

interface Montage {
  z: number[][];
  npeaks: number;
  nreps: number;
  ny: number;
  nx: number;
}

/**
 * Lay the maps out as one image, peaks down and repetitions across.
 *
 * Each peak is scaled by its own maximum, so a weak metabolite stays visible
 * next to the substrate, and a bright line separates the rows.
 */
const buildMontage = (
  voxels: MrdImageData,
  namedPeaks: number,
  measurementIndex: number
): Montage | null => {
  const channels = voxels.length;
  const ny = voxels[0]?.[0]?.length ?? 0;
  const nx = voxels[0]?.[0]?.[0]?.length ?? 0;
  const measurements = voxels[0]?.[0]?.[0]?.[0]?.[0]?.length ?? 0;
  if (channels === 0 || ny === 0 || nx === 0) return null;

  // The source is (npeaks, nreps, ny, nx) and the server folds the leading axes
  // into the channel axis, so a channel is one peak's one repetition.
  let npeaks: number;
  let nreps: number;
  let read: (peak: number, rep: number, y: number, x: number) => number;
  if (namedPeaks > 0 && channels % namedPeaks === 0) {
    npeaks = namedPeaks;
    nreps = channels / namedPeaks;
    read = (peak, rep, y, x) =>
      voxels[peak * nreps + rep]?.[0]?.[y]?.[x]?.[0]?.[measurementIndex] ?? 0;
  } else if (measurements > 1) {
    npeaks = channels;
    nreps = measurements;
    read = (peak, rep, y, x) => voxels[peak]?.[0]?.[y]?.[x]?.[0]?.[rep] ?? 0;
  } else {
    return null;
  }

  const z: number[][] = Array.from({ length: npeaks * ny }, () => new Array<number>(nreps * nx).fill(0));
  for (let peak = 0; peak < npeaks; peak += 1) {
    let peakMax = 0;
    for (let rep = 0; rep < nreps; rep += 1) {
      for (let y = 0; y < ny; y += 1) {
        for (let x = 0; x < nx; x += 1) {
          peakMax = Math.max(peakMax, Math.abs(read(peak, rep, y, x)));
        }
      }
    }
    if (peakMax > 0) {
      for (let rep = 0; rep < nreps; rep += 1) {
        for (let y = 0; y < ny; y += 1) {
          for (let x = 0; x < nx; x += 1) {
            z[peak * ny + y][rep * nx + x] = read(peak, rep, y, x) / peakMax;
          }
        }
      }
    }
    z[peak * ny].fill(1);
  }

  return { z, npeaks, nreps, ny, nx };
};

interface MetaboliteMapProps {
  maps: MapsBundle;
  measurementIndex: number;
  onVoxelSelect: (voxel: VoxelSelection) => void;
}

/** Each metabolite's map across the repetitions, one row of tiles per peak. */
const MetaboliteMapComponent: React.FC<MetaboliteMapProps> = ({
  maps,
  measurementIndex,
  onVoxelSelect,
}) => {
  const { containerRef, width, height } = usePlotSize();

  const montage = useMemo(
    () => buildMontage(maps.voxels, maps.peakNames.length, measurementIndex),
    [maps.voxels, maps.peakNames.length, measurementIndex]
  );

  const plotData = useMemo<Data[]>(
    () =>
      montage
        ? [
            {
              z: montage.z,
              type: 'heatmap',
              colorscale: 'Greys',
              reversescale: true,
              zsmooth: false,
              showscale: false,
              hovertemplate: 'rep %{x}<br>row %{y}<br>%{z:.3f}<extra></extra>',
            },
          ]
        : [],
    [montage]
  );

  const handleClick = (event: Readonly<PlotMouseEvent>) => {
    const point = event.points?.[0];
    if (!montage || !point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
    onVoxelSelect({
      row: Math.floor(point.y) % montage.ny,
      col: Math.floor(point.x) % montage.nx,
    });
  };

  if (!montage) {
    const shape = maps.voxels.length > 0
      ? `${maps.voxels.length}×${maps.voxels[0]?.[0]?.length ?? 0}×${maps.voxels[0]?.[0]?.[0]?.length ?? 0}`
      : 'empty';
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
        <Typography variant="body2" sx={{ color: '#bbb', textAlign: 'center' }}>
          Cannot lay out these maps: {maps.peakNames.length} peak names against a
          {' '}{shape} array
        </Typography>
      </Box>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Plot
        data={plotData}
        onClick={handleClick}
        layout={{
          width: width || undefined,
          height: height || undefined,
          margin: { l: 80, r: 10, t: 34, b: 40 },
          title: {
            text: '<sub>each row scaled to its own maximum</sub>',
            font: { size: 10, color: '#bbb' },
            x: 0.02,
          },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#bbb', size: 10 },
          xaxis: {
            title: 'repetition',
            showgrid: false,
            zeroline: false,
            tickmode: 'array',
            tickvals: Array.from({ length: montage.nreps }, (_, i) => i * montage.nx + montage.nx / 2),
            ticktext: Array.from({ length: montage.nreps }, (_, i) => String(i)),
          },
          yaxis: {
            autorange: 'reversed',
            showgrid: false,
            zeroline: false,
            scaleanchor: 'x',
            tickmode: 'array',
            tickvals: Array.from({ length: montage.npeaks }, (_, i) => i * montage.ny + montage.ny / 2),
            ticktext: Array.from({ length: montage.npeaks }, (_, i) => maps.peakNames[i] ?? String(i)),
          },
        }}
        config={{
          displayModeBar: true,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
          toImageButtonOptions: { format: 'png', filename: 'metabolite_maps', scale: 1 },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default MetaboliteMapComponent;
