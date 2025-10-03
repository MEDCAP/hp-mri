// src/components/FooterHomepage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import Medcap from './../assets/medcap_logo.png';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#CCCCCC',
        width: '100%',
        textAlign: 'center',
        marginTop: 'auto', // Push footer to bottom when content is short
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          margin: '0 auto',
          padding: '30px',
        }}
      >
        <Box
          component="img"
          src={Medcap}
          alt="Footer Logo"
          sx={{
            height: '150px',
            margin: 0,
            marginRight: '20px',
          }}
        />
        <Box
          sx={{
            margin: 0,
            lineHeight: 1.5,
            textAlign: 'left',
          }}
        >
          <Typography variant="body1">1-125 Smilow Center for Translational Research</Typography>
          <Typography variant="body1">3400 Civic Center Blvd.</Typography>
          <Typography variant="body1">Philadelphia, PA  19104</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;