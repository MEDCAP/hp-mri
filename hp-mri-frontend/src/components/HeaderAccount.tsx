import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, useTheme, Button } from '@mui/material';
import PigiLogo from './../assets/pigi_optblue_transparentexceptpennlogo.png';
import Medcap from './../assets/medcap.png'
import { getCurrentUserName, signOutCognito } from '../pages/loginpages/cognitoUtils';

// Change header account color when used in files retrieval and viewer page
interface HeaderAccountProps {
  background_black?: boolean;
}

const HeaderAccount: React.FC<HeaderAccountProps> = ({ background_black = false}) => {
  const theme = useTheme();
  const userName = getCurrentUserName();
  const navigate = useNavigate();
  const handleSignOut = () => {
    signOutCognito();
    navigate('/');  // return to homepage upon sign out
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: background_black ? 'black' : theme.palette.background.default,
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
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
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
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: background_black? "white" : theme.palette.primary.main,
            textAlign: 'center',
            flexGrow: 1,
            letterSpacing: 1.2,
          }}
        >
          HP-MRI
        </Typography>

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
              sx={{ fontWeight: 700, ml: 1, textTransform: 'none', borderRadius: 2 }}
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
