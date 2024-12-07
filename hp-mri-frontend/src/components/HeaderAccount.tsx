import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Tooltip, useTheme } from '@mui/material';
import PigiLogo from './../images/penn_image.png';
// import TheMedcap from './../images/the-medcap.png';
import Medcap from './../images/medcap.png'

const HeaderAccount: React.FC = () => {
  const theme = useTheme();

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        boxShadow: 3,
        borderBottom: `1px solid ${theme.palette.divider}`,
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
          <Link to="/mrd-files">
            <img
              src={PigiLogo}
              alt="Pigi Logo"
              style={{ height: 45, cursor: 'pointer' }}
            />
            <img src={Medcap} alt="The Medcap Logo" style={{ height: 50 }} />
          </Link>
          {/* <img src={TheMedcap} alt="The Medcap Logo" style={{ height: 40 }} /> */}

        </Box>

        {/* Center Section: Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: theme.palette.primary.main,
            textAlign: 'center',
            flexGrow: 1,
            letterSpacing: 1.2,
          }}
        >
          HP-MRI
        </Typography>

        {/* Right Section: Account */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginRight: '-5px' }}>
          <Tooltip title="Go to Account">
            <Link to="/account" style={{ textDecoration: 'none', color: 'inherit' }}>
              <IconButton
                sx={{
                  transition: 'background-color 0.3s',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.getContrastText(theme.palette.primary.main),
                  }}
                >
                  <FaUserCircle size={20} />
                </Avatar>
              </IconButton>
            </Link>
          </Tooltip>
          <Typography
            variant="body1"
            sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}
          >
            Account
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderAccount;
