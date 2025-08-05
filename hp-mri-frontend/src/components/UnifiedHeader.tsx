import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, useTheme, Button } from '@mui/material';
import PigiLogo from './../assets/pigi_optblue_transparentexceptpennlogo.png';
import Medcap from './../assets/medcap.png';
import { getCurrentUserName, signOutCognito } from '../pages/loginpages/cognitoUtils';

const UnifiedHeader: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status on mount and when location changes
    const checkAuth = () => {
      const currentUser = getCurrentUserName();
      setUserName(currentUser);
    };

    checkAuth();
    
    // Check auth status periodically
    const interval = setInterval(checkAuth, 1000);
    
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleSignOut = () => {
    signOutCognito();
    setUserName(null);
    navigate('/');
  };

  // Check if we're on the homepage
  const isHomepage = location.pathname === '/';

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingX: { xs: 2, sm: 4 },
          minHeight: '64px',
        }}
      >
        {/* Left Section: Logos */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          transition: 'transform 0.2s ease',
          '&:hover': {
            transform: 'scale(1.02)',
          }
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={PigiLogo}
              alt="Pigi Logo"
              style={{ 
                height: 36, 
                cursor: 'pointer',
                filter: 'brightness(1.1)',
              }}
            />
            <img 
              src={Medcap} 
              alt="The Medcap Logo" 
              style={{ 
                height: 36, 
                marginLeft: 6,
                filter: 'brightness(1.1)',
              }} 
            />
          </Link>
        </Box>

        {/* Center Section: Title - only show when not on homepage */}
        {!isHomepage && (
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#011F5B',
              textAlign: 'center',
              flexGrow: 1,
              letterSpacing: 2,
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            HP-MRI
          </Typography>
        )}

        {/* Center Section: Navigation Links - only show on homepage */}
        {isHomepage && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            flexGrow: 1, 
            justifyContent: 'center' 
          }}>
            <Link to="/mr-coil-calculator" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="medium"
                sx={{
                  background: '#011F5B',
                  color: 'white',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#001233',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                MR Coil Calculator
              </Button>
            </Link>
            <Button
              variant="contained"
              size="medium"
              href="https://github.com/MEDCAP"
              target="_blank"
              sx={{
                background: '#011F5B',
                color: 'white',
                fontWeight: 500,
                textTransform: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: '#001233',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              GitHub
            </Button>
            <Link to="/about-devs" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="medium"
                sx={{
                  background: '#011F5B',
                  color: 'white',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#001233',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                About Devs
              </Button>
            </Link>
            <Link to="/research" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="medium"
                sx={{
                  background: '#011F5B',
                  color: 'white',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#001233',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Research
              </Button>
            </Link>
          </Box>
        )}

        {/* Right Section: Account */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          background: '#f5f5f5',
          borderRadius: '12px',
          padding: '8px 12px',
          border: '1px solid #e0e0e0',
        }}>
          {/* Account Section */}
          {userName ? (
            <>
              {/* Show MRD Files access on homepage when logged in */}
              {isHomepage && (
                <Link to="/mrd-files" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="contained"
                    size="medium"
                    sx={{
                      background: '#28a745',
                      color: 'white',
                      fontWeight: 500,
                      textTransform: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: '#218838',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Go to Tool
                  </Button>
                </Link>
              )}
              
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 500, 
                  color: '#333',
                  marginX: 1,
                }}
              >
                Welcome, {userName}
              </Typography>
              <Button
                variant="contained"
                size="medium"
                onClick={handleSignOut}
                sx={{
                  background: '#dc3545',
                  color: 'white',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#c82333',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            // Show sign in button when not authenticated
            <Link to="/account" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="medium"
                sx={{
                  background: '#011F5B',
                  color: 'white',
                  fontWeight: 500,
                  textTransform: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: '#001233',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Sign In
              </Button>
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default UnifiedHeader; 