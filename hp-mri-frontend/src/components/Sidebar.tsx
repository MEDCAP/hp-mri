import React from 'react';
import { FaCube, FaFile, FaImages } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isOpen ? '240px' : '80px',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isOpen ? '240px' : '80px',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          boxShadow: 3,
          backgroundColor: 'background.default',
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: '16px',
          paddingTop: '74px',
          backgroundColor: 'primary.main',
          color: 'white',
        }}
      >
        {isOpen && (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', marginTop: '5px' }}>
            Menu
          </Typography>
        )}
        <IconButton onClick={toggleSidebar} sx={{ color: 'white', top: '2.5px' }}>
          <MenuIcon />
        </IconButton>
      </Box>
      <Divider />

      {/* Sidebar Links */}
      <List>
        {/* MRD Files Link */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/tools"
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaFile color={isOpen ? '#011F5B' : 'inherit'} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="MRD Files"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                }}
              />
            )}
          </ListItemButton>
        </ListItem>

        {/* Images Link */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/images"
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaImages color={isOpen ? '#011F5B' : 'inherit'} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Images"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                }}
              />
            )}
          </ListItemButton>
        </ListItem>

        {/* Simulator Link */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/simulator"
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaCube color={isOpen ? '#011F5B' : 'inherit'} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Simulator"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
    </Drawer>
  );
};

export default Sidebar;
