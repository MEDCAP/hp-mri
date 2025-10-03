import React from 'react';
import { Box } from '@mui/material';
import HeaderAccount from './HeaderAccount';

interface MRDLayoutProps {
  children: React.ReactNode;
}

/**
 * MRDLayout component for MRD file management pages
 * Includes HeaderAccount (fixed at top)
 * Automatically handles padding for fixed header positioning
 */
const MRDLayout: React.FC<MRDLayoutProps> = ({ children }) => {
  return (
    <>
      <HeaderAccount />
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          paddingTop: '72px', // Account for fixed header height
        }}
      >
        {children}
      </Box>
    </>
  );
};

export default MRDLayout; 