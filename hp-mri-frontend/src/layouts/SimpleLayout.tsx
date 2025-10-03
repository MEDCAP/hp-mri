import React from 'react';
import { Box } from '@mui/material';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

/**
 * SimpleLayout component for pages without header/footer
 * Used for login pages, account pages, and standalone tools
 */
const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
      }}
    >
      {children}
    </Box>
  );
};

export default SimpleLayout; 