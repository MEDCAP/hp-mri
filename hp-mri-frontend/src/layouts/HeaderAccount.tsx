import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, useTheme, Button } from '@mui/material';
import PigiLogo from './../assets/pigi_optblue_transparentexceptpennlogo.png';
import Medcap from './../assets/medcap_logo.png'
import { getCurrentUserName, signOutCognito } from '../pages/loginpages/cognitoUtils';

// Change header account color when used in files retrieval and viewer page
interface HeaderAccountProps {
  background_black?: boolean;
}

const HeaderAccount: React.FC<HeaderAccountProps> = ({ background_black = false}) => {
  const theme = useTheme();
  const [userName, setUserName] = useState<string | null>(getCurrentUserName);
  const navigate = useNavigate();
  const handleSignOut = () => {
    signOutCognito();
    setUserName(null);
    window.dispatchEvent(new Event('auth-change')); // notify other components
    navigate('/');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: background_black ? 'theme.palette.background.default' : theme.palette.background.default,
        color: theme.palette.text.primary,
        boxShadow: background_black ? 0 : 3,
        borderBottom: background_black ? 'none' : `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingX: { xs: 2, sm: 4 },
        }}
      >
        {/* Left Section: Logos */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: '5px', marginLeft: '-15px' }}>
          <Link to="/mrd-files" style={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              backgroundColor: background_black ? 'white' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={PigiLogo}
                alt="Pigi Logo"
                style={{ height: 40, cursor: 'pointer' }}
              />
              <img
                src={Medcap}
                alt="The Medcap Logo"
                style={{ height: 40 }} 
              />
            </Box>
          </Link>
        </Box>

        {/* Center Section: Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1, justifyContent: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: background_black? "white" : theme.palette.primary.main,
              letterSpacing: 1.2,
            }}
          >
            HP-MRI
          </Typography>
        </Box>

        {/* Right Section: Account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {userName && (
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: background_black ? "white" : theme.palette.primary.main }}>
              Welcome, {userName}
            </Typography>
          )}
          {userName && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleSignOut}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
            >
              Sign Out
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default HeaderAccount;
