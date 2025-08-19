import React, { useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { Box, Button, Typography } from '@mui/material';

interface PulsePlotProps {
  fileId: string | null;
  sidebarWidth?: number; // Add sidebar width prop to trigger re-renders
}

interface PulseApiResponse {
  pulse_data: number[][]; // shape: [channels][samples]
  pulse_phase: number[];  // shape: [samples]
}

// Simple in-memory cache: fileId -> response
const pulseCache: Record<string, PulseApiResponse> = {};

export const PulsePlotComponent: React.FC<PulsePlotProps> = ({ fileId, sidebarWidth = 0 }) => {
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

  const handleTypeChange = (type: 'pulse_data' | 'pulse_phase') => {
    setSelectedType(type);
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
    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      {/* Main Plot Area */}
      <Box sx={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            key={`${fileId}-${sidebarWidth}`} // Force re-render when sidebar width changes
            data={plotData as any}
            layout={{
              margin: { l: 40, r: 5, t: 5, b: 25 },
              paper_bgcolor: 'white',
              plot_bgcolor: 'white',
              xaxis: { title: 'Index', showgrid: true, zeroline: false },
              yaxis: { title: 'Value', showgrid: true, zeroline: false },
              legend: { orientation: 'h', y: -0.1 },
            }}
            config={{ displayModeBar: false, staticPlot: true, responsive: true }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true} // Enable resize handling
          />
        )}
      </Box>

      {/* Right Sidebar */}
      <Box sx={{ 
        width: 160, 
        height: '100%', 
        borderLeft: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333' }}>
          Controls
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant={selectedType === 'pulse_data' ? 'contained' : 'outlined'}
            onClick={() => handleTypeChange('pulse_data')}
            size="small"
            sx={{
              minWidth: 'auto',
              padding: '4px 6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderColor: '#1976d2',
              color: selectedType === 'pulse_data' ? 'white' : '#1976d2',
              backgroundColor: selectedType === 'pulse_data' ? '#1976d2' : 'white',
              '&:hover': {
                backgroundColor: selectedType === 'pulse_data' ? '#1565c0' : '#f3f8ff',
                borderColor: '#1565c0',
              },
              textTransform: 'none',
              borderRadius: '4px',
              boxShadow: selectedType === 'pulse_data' ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
              '&:active': {
                transform: 'translateY(1px)',
              }
            }}
          >
            Pulse Data
          </Button>
          
          <Button
            variant={selectedType === 'pulse_phase' ? 'contained' : 'outlined'}
            onClick={() => handleTypeChange('pulse_phase')}
            size="small"
            sx={{
              minWidth: 'auto',
              padding: '4px 6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderColor: '#1976d2',
              color: selectedType === 'pulse_phase' ? 'white' : '#1976d2',
              backgroundColor: selectedType === 'pulse_phase' ? '#1976d2' : 'white',
              '&:hover': {
                backgroundColor: selectedType === 'pulse_phase' ? '#1565c0' : '#f3f8ff',
                borderColor: '#1565c0',
              },
              textTransform: 'none',
              borderRadius: '4px',
              boxShadow: selectedType === 'pulse_phase' ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
              '&:active': {
                transform: 'translateY(1px)',
              }
            }}
          >
            Pulse Phase
          </Button>
        </Box>

        {/* Placeholder for future features */}
        <Box sx={{ flex: 1 }} />
      </Box>
    </Box>
  );
}; 