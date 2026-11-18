import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Annotations, Data, Shape } from 'plotly.js';
import { Box, Typography } from '@mui/material';
import { MrdTraceData } from '../../../api/types';
import { SpectrumBundle } from '../hooks/useViewerState';
import { usePlotSize } from '../hooks/usePlotSize';

/**
 * True modulo. JavaScript's `%` is a remainder and goes negative, which would
 * fold a peak off the low end of the axis instead of round to its high end.
 */
const wrap = (value: number, modulus: number): number => ((value % modulus) + modulus) % modulus;

const seriesName = (
  index: number,
  count: number,
  transform: SpectrumBundle['transform']
): string => {
  if (count === 2) return index === 0 ? 'real' : 'imag';
  if (count === 1 && transform === 'magnitude') return 'magnitude';
  return `series ${index}`;
};

const seriesValues = (data: MrdTraceData, measurementIndex: number): number[][] =>
  data.map(series => series.map(sample => sample[measurementIndex] ?? sample[0] ?? 0));

interface SpectrumPlotProps {
  spectrum: SpectrumBundle;
  measurementIndex: number;
}

/**
 * The summed spectrum and the model fitted to it, sample by sample.
 *
 * Drawn as the samples that were fitted rather than as a curve through them:
 * the spectrum is one point per switch, so a smooth line would be drawing
 * resolution the data does not have. Each peak is labelled with the distance
 * the fit moved it from where its named offset placed it, which is what says
 * whether the pattern landed.
 */
const SpectrumPlotComponent: React.FC<SpectrumPlotProps> = ({ spectrum, measurementIndex }) => {
  const { containerRef, width, height } = usePlotSize();

  const series = useMemo(
    () => seriesValues(spectrum.samples, measurementIndex),
    [spectrum.samples, measurementIndex]
  );
  const fitSeries = useMemo(
    () => (spectrum.fitSamples ? seriesValues(spectrum.fitSamples, measurementIndex) : []),
    [spectrum.fitSamples, measurementIndex]
  );

  const sampleCount = series[0]?.length ?? 0;
  const x = useMemo(
    () =>
      spectrum.xscalePpm.length === sampleCount
        ? spectrum.xscalePpm
        : Array.from({ length: sampleCount }, (_, i) => i),
    [spectrum.xscalePpm, sampleCount]
  );

  const peaks = useMemo(() => {
    const fitted = spectrum.centersPpm;
    if (!fitted || fitted.length === 0 || x.length < 2) return [];

    const { peakOffsetsPpm: offsets, biggestPeakIndex: biggest } = spectrum;
    const bwPpm = x[x.length - 1] - x[0] + (x[1] - x[0]);

    let deltas: number[] | null = null;
    if (biggest !== null && offsets.length === fitted.length && offsets[biggest] !== undefined) {
      const magnitudes = series[0] ?? [];
      let anchorIndex = 0;
      magnitudes.forEach((value, i) => {
        if (Math.abs(value) > Math.abs(magnitudes[anchorIndex])) anchorIndex = i;
      });
      const anchor = x[anchorIndex];
      const placed = offsets.map(offset => wrap(anchor - (offset - offsets[biggest]), bwPpm));
      deltas = fitted.map((center, i) => wrap(center - placed[i] + bwPpm / 2, bwPpm) - bwPpm / 2);
    }

    return fitted.map((center, i) => {
      const name = spectrum.peakNames[i] ?? String(i);
      const delta = deltas ? ` ${deltas[i] >= 0 ? '+' : ''}${deltas[i].toFixed(3)}` : '';
      return { center, label: `${name}${delta} @${center.toFixed(2)}`, index: i };
    });
  }, [spectrum, x, series]);

  const plotData = useMemo<Data[]>(() => {
    const traces: Data[] = series.map((y, index) => ({
      x,
      y,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { size: 4 },
      line: { width: 0.8, shape: 'linear' },
      name: seriesName(index, series.length, spectrum.transform),
    }));

    fitSeries.forEach((y, index) => {
      traces.push({
        x,
        y,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { size: 3 },
        line: { width: 0.8, shape: 'linear', dash: 'dash' },
        name: `fit ${seriesName(index, fitSeries.length, spectrum.transform)}`,
      });
    });

    return traces;
  }, [series, fitSeries, x, spectrum.transform]);

  const shapes = useMemo<Partial<Shape>[]>(
    () =>
      peaks.map(peak => ({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: peak.center,
        x1: peak.center,
        y0: 0,
        y1: 1,
        line: { color: 'rgba(255,255,255,0.35)', width: 0.8 },
      })),
    [peaks]
  );

  // Peaks can sit close together, so the labels run vertically and alternate height.
  const annotations = useMemo<Partial<Annotations>[]>(
    () =>
      peaks.map(peak => ({
        x: peak.center,
        xref: 'x',
        y: 0.22 + 0.34 * (peak.index % 2),
        yref: 'paper',
        text: peak.label,
        textangle: '-90',
        showarrow: false,
        xanchor: 'right',
        yanchor: 'bottom',
        font: { size: 9, color: '#ddd' },
        bgcolor: 'rgba(0,0,0,0.65)',
      })),
    [peaks]
  );

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (spectrum.biggestPeakName) parts.push(`anchored on ${spectrum.biggestPeakName}`);
    if (spectrum.fitLoss !== null) parts.push(`residual ${spectrum.fitLoss.toFixed(3)}`);
    if (series.length === 1 && spectrum.transform === 'magnitude') {
      parts.push('magnitude only: the server reduces complex arrays before sending them');
    }
    parts.push('one marker per sample, Δ is how far the fit moved each peak');
    return parts.join('. ');
  }, [spectrum, series.length]);

  if (sampleCount === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body2" sx={{ color: '#bbb' }}>No spectrum in this file</Typography>
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
          margin: { l: 50, r: 10, t: 34, b: 36 },
          title: { text: `<sub>${subtitle}</sub>`, font: { size: 10, color: '#bbb' }, x: 0.02 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#bbb', size: 10 },
          xaxis: {
            title: spectrum.xscalePpm.length === sampleCount ? 'frequency (ppm)' : 'sample',
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.12)',
            zeroline: false,
          },
          yaxis: {
            title: 'amplitude',
            showgrid: true,
            gridcolor: 'rgba(255,255,255,0.12)',
            zeroline: false,
          },
          shapes,
          annotations,
          showlegend: true,
          legend: { orientation: 'h', y: -0.22, font: { color: '#bbb' } },
        }}
        config={{
          displayModeBar: true,
          responsive: true,
          modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
          toImageButtonOptions: { format: 'png', filename: 'mrd_spectrum', scale: 1 },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default SpectrumPlotComponent;
