import React, { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import Sidebar from '../../components/Sidebar';
import { SIDEBAR_CLOSED_CONTENT_MARGIN, SIDEBAR_OPEN_CONTENT_MARGIN } from '../../layouts/layoutConstants';

const SimulatorPage: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const contentMargin = isSidebarOpen ? SIDEBAR_OPEN_CONTENT_MARGIN : SIDEBAR_CLOSED_CONTENT_MARGIN;

  return (
    <div
      style={{
        width: `calc(100% - ${contentMargin})`,
        marginLeft: contentMargin,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: 'calc(100vh - 72px)', // MRDLayout's fixed header
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <Box sx={{ textAlign: 'center', px: 4 }}>
        <ConstructionIcon sx={{ fontSize: 72, color: '#011F5B', opacity: 0.4, mb: 2 }} />
        <Chip
          label="Coming Soon"
          sx={{
            mb: 3,
            backgroundColor: '#011F5B',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.85rem',
            px: 1,
          }}
        />
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 700, color: '#011F5B', mb: 2 }}
        >
          MRI Simulator
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 400, lineHeight: 1.7, maxWidth: 480, mx: 'auto' }}
        >
          Bloch equation-based MRI simulation to test and validate reconstruction
          methods before running on real data.
        </Typography>
      </Box>
    </div>
  );
};

export default SimulatorPage;
