import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import PigiLogo from './../assets/pigi_optblue_transparentexceptpennlogo.png';
import { getCurrentUserName, signOutCognito } from '../pages/loginpages/cognitoUtils';

const UnifiedHeader: React.FC = () => {
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
      position={isHomepage ? "static" : "fixed"}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexGrow: 1,
        }}>
          {/* Logo */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            transition: 'opacity 0.2s ease',
            '&:hover': {
              opacity: 0.8,
            }
          }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img
                src={PigiLogo}
                alt="Pigi Lab Logo"
                style={{ 
                  height: 32, 
                  cursor: 'pointer',
                }}
              />
            </Link>
          </Box>

          {/* Navigation Links - only show on homepage */}
          {isHomepage && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 3, 
              marginLeft: 4
            }}>
              <Link to="/mr-coil-calculator" style={{ textDecoration: 'none' }}>
                <Typography
                  sx={{
                    color: '#333333',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: '#011F5B',
                    },
                  }}
                >
                  MR Coil Calculator
                </Typography>
              </Link>
              <Typography
                component="a"
                href="https://github.com/MEDCAP"
                target="_blank"
                sx={{
                  color: '#333333',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#011F5B',
                  },
                }}
              >
                GitHub
              </Typography>
              <Link to="/about-devs" style={{ textDecoration: 'none' }}>
                <Typography
                  sx={{
                    color: '#333333',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: '#011F5B',
                    },
                  }}
                >
                  About Devs
                </Typography>
              </Link>
              <Link to="/research" style={{ textDecoration: 'none' }}>
                <Typography
                  sx={{
                    color: '#333333',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    '&:hover': {
                      color: '#011F5B',
                    },
                  }}
                >
                  Research
                </Typography>
              </Link>
            </Box>
          )}

          {/* Center Section: Title - only show when not on homepage */}
          {!isHomepage && (
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: '#011F5B',
                textAlign: 'center',
                flexGrow: 1,
                letterSpacing: '-0.5px',
                marginLeft: 4,
              }}
            >
              HP-MRI
            </Typography>
          )}
        </Box>

        {/* Right Section: Account */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
        }}>
          {/* Account Section */}
          {userName ? (
            <>
              {/* Show MRD Files access on homepage when logged in */}
              {isHomepage && (
                <Link to="/mrd-files" style={{ textDecoration: 'none' }}>
                  <Typography
                    sx={{
                      color: '#333333',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      '&:hover': {
                        color: '#011F5B',
                      },
                    }}
                  >
                    Go to Tool
                  </Typography>
                </Link>
              )}
              
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 500, 
                  color: '#333333',
                  fontSize: '0.9rem',
                }}
              >
                Welcome, {userName}
              </Typography>
              <Typography
                onClick={handleSignOut}
                sx={{
                  color: '#d32f2f',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#b71c1c',
                  },
                }}
              >
                Sign Out
              </Typography>
            </>
          ) : (
            // Show sign in button when not authenticated
            <Link to="/account" style={{ textDecoration: 'none' }}>
              <Typography
                sx={{
                  color: '#333333',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#011F5B',
                  },
                }}
              >
                Sign In
              </Typography>
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default UnifiedHeader; 