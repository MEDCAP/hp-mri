import React, { useEffect } from 'react';
import { Box, Container, Typography, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

const SimulatePage: React.FC = () => {
  useEffect(() => {
    document.title = 'MRI Simulator - Coming Soon';
  }, []);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 72px)',
        backgroundColor: '#f0f4ff',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center' }}>
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
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, lineHeight: 1.7 }}>
            Bloch equation-based MRI simulation to test and validate reconstruction methods
            before running on real data.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SimulatePage;
