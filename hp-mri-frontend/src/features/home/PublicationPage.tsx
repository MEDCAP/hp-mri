// src/pages/PublicationPage.tsx
import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const PublicationPage: React.FC = () => {
  return (
    <Container
      maxWidth="lg"
      sx={{
        paddingY: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '60vh',
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        Publications
      </Typography>
      <Box sx={{ marginTop: 4 }}>
        <Typography variant="h6" color="textSecondary">
          Currently Work-in-Progress
        </Typography>
      </Box>
    </Container>
  );
};

export default PublicationPage;
