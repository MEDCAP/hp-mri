import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import PigiLogo from './../assets/pigi_optblue_transparentexceptpennlogo.png';
import MedCapLogo from './../assets/medcap_logo.png';
import { getCurrentUserName, signOutCognito } from '../pages/loginpages/cognitoUtils';

// Reusable styles for navigation links
const NAV_LINK_STYLE = {
  color: '#333333',
  fontWeight: 500,
  fontSize: '0.95rem',
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'color 0.2s ease',
  '&:hover': {
    color: '#011F5B',
  },
};

const HeaderHomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = getCurrentUserName();
      setUserName(currentUser);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleSignOut = () => {
    signOutCognito();
    setUserName(null);
    navigate('/');
  };

  return (
    <AppBar
      position="static"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'white',
        borderBottom: 'none',
        boxShadow: 3,
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          paddingX: { xs: 3, sm: 6 },
          minHeight: '72px',
        }}
      >
        {/* Left Section: Logo and Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {/* Logos */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <Box
                component="img"
                src={PigiLogo}
                alt="PIGI Lab Logo"
                sx={{ height: 32 }}
              />
              <Box
                component="img"
                src={MedCapLogo}
                alt="MedCap Logo"
                sx={{ height: 32 }}
              />
            </Box>
          </Link>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
            <Link to="/mr-coil-calculator" style={{ textDecoration: 'none' }}>
              <Typography sx={NAV_LINK_STYLE}>MR Coil Calculator</Typography>
            </Link>
            <Typography component="a" href="https://github.com/MEDCAP" target="_blank" sx={NAV_LINK_STYLE}>
              GitHub
            </Typography>
            <Link to="/members" style={{ textDecoration: 'none' }}>
              <Typography sx={NAV_LINK_STYLE}>About Devs</Typography>
            </Link>
          </Box>
        </Box>

        {/* Right Section: Account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {userName ? (
            <>
              <Button
                variant="contained"
                onClick={() => navigate('/mrd-files')}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Go to Tool
              </Button>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 500, color: '#555', fontSize: '0.9rem' }}
              >
                Welcome, {userName}
              </Typography>
              <Button
                variant="text"
                color="error"
                onClick={handleSignOut}
                sx={{ fontWeight: 600 }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={() => navigate('/mrd-files')}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Try MR Visualizer
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/account')}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  borderColor: '#011F5B',
                  color: '#011F5B',
                  '&:hover': { backgroundColor: '#f0f4ff', borderColor: '#011F5B' },
                }}
              >
                Sign In
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderHomePage; 