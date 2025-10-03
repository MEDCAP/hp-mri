import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import HeaderHomePage from './HeaderHomePage';
import Footer from './Footer';

interface HomePageLayoutProps {
  children: React.ReactNode;
}

/**
 * HomeLayout component for homepage-style pages
 * Header at top, footer at bottom of page content
 * Entire page scrolls together (window scroll)
 * Scroll resets to top on route changes
 */
const HomeLayout: React.FC<HomePageLayoutProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Reset scroll position to top when route changes as vertical
    // scroll position is kept when the same layout is used
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <HeaderHomePage />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default HomeLayout; 