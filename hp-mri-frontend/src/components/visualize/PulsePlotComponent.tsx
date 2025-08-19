import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { Box, FormControl, InputLabel, MenuItem, Typography } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';

interface PulsePlotProps {
  fileId: string | null;
}

interface PulseApiResponse {
  pulse_data: number[][]; // shape: [channels][samples]
  pulse_phase: number[];  // shape: [samples]
}

// Simple in-memory cache: fileId -> response
const pulseCache: Record<string, PulseApiResponse> = {};

export const PulsePlotComponent: React.FC<PulsePlotProps> = ({ fileId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseData, setPulseData] = useState<number[][]>([]);
  const [pulsePhase, setPulsePhase] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<'pulse_data' | 'pulse_phase'>('pulse_data');

  useEffect(() => {
    const fetchPulse = async () => {
      if (!fileId) {
        setPulseData([]);
        setPulsePhase([]);
        return;
      }

      // If cached, use it immediately
      const cached = pulseCache[fileId];
      if (cached) {
        setPulseData(cached.pulse_data || []);
        setPulsePhase(cached.pulse_phase || []);
      }

      try {
        setLoading(!cached); // show loader only if not cached
        setError(null);
        const resp = await axios.get<PulseApiResponse>(`/api/viewer/get_pulse_array/${fileId}`);
        setPulseData(resp.data.pulse_data || []);
        setPulsePhase(resp.data.pulse_phase || []);
        pulseCache[fileId] = resp.data; // update cache
      } catch (e: any) {
        if (!cached) {
          setError(e?.response?.data?.error || e?.message || 'Failed to fetch pulse data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPulse();
  }, [fileId]);

  const handleTypeChange = (e: SelectChangeEvent) => {
    const val = e.target.value as 'pulse_data' | 'pulse_phase';
    setSelectedType(val);
  };

  const plotData = useMemo(() => {
    if (selectedType === 'pulse_phase') {
      const y = pulsePhase || [];
      const x = y.map((_, idx) => idx);
      return [
        {
          x,
          y,
          type: 'scatter',
          mode: 'lines',
          line: { color: '#1976d2', width: 1.5 },
          name: 'Pulse Phase',
        },
      ];
    }

    // pulse_data: multiple channels
    const traces: any[] = [];
    for (let ch = 0; ch < (pulseData?.length || 0); ch++) {
      const y = pulseData[ch] || [];
      const x = y.map((_, idx) => idx);
      traces.push({
        x,
        y,
        type: 'scatter',
        mode: 'lines',
        line: { width: 1 },
        name: `Channel ${ch + 1}`,
      });
    }
    return traces;
  }, [selectedType, pulseData, pulsePhase]);

  const hasData = useMemo(() => {
    if (selectedType === 'pulse_phase') return (pulsePhase?.length || 0) > 0;
    return (pulseData?.length || 0) > 0 && (pulseData[0]?.length || 0) > 0;
  }, [selectedType, pulseData, pulsePhase]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Header Row */}
      <Box sx={{ position: 'absolute', top: 8, right: 12, zIndex: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="pulse-type-label">Data Type</InputLabel>
          <Select
            labelId="pulse-type-label"
            value={selectedType}
            label="Data Type"
            onChange={handleTypeChange}
          >
            <MenuItem value="pulse_data">Pulse Data</MenuItem>
            <MenuItem value="pulse_phase">Pulse Phase</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Body */}
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Loading pulse data...</Typography>
        ) : error ? (
          <Typography variant="body2" color="error">{error}</Typography>
        ) : !fileId ? (
          <Typography variant="body2" color="text.secondary">Select a file in any window to view pulse data</Typography>
        ) : !hasData ? (
          <Typography variant="body2" color="text.secondary">No data available</Typography>
        ) : (
          <Plot
            data={plotData as any}
            layout={{
              margin: { l: 50, r: 20, t: 10, b: 40 },
              paper_bgcolor: 'white',
              plot_bgcolor: 'white',
              xaxis: { title: 'Index', showgrid: true, zeroline: false },
              yaxis: { title: 'Value', showgrid: true, zeroline: false },
              legend: { orientation: 'h' },
            }}
            config={{ displayModeBar: false, staticPlot: true }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </Box>
    </Box>
  );
}; 