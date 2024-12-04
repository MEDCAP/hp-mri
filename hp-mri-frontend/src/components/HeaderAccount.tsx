import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { Avatar } from '@mui/material';
import PigiLogo from './../images/pigi-optblue_transparentexceptpennlogo.png';
import TheMedcap from './../images/the-medcap.png';

const HeaderAccount: React.FC = () => {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'background.default',
        color: 'text.primary',
        boxShadow: 2,
        borderBottom: '1px solid #e0e0e0',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left Section: Logos */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link to="/">
            <img
              src={PigiLogo}
              alt="App Logo"
              style={{ height: 40, cursor: 'pointer' }}
            />
          </Link>
          <img src={TheMedcap} alt="App Logo 2" style={{ height: 40 }} />
        </Box>

        {/* Center Section: Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'primary.main',
            textAlign: 'center',
            flexGrow: 1,
          }}
        >
          HP-MRI
        </Typography>

        {/* Right Section: Account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link to="/account" style={{ textDecoration: 'none', color: 'inherit' }}>
            <IconButton>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <FaUserCircle />
              </Avatar>
            </IconButton>
          </Link>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Account
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderAccount;
