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
      {/* Sidebar Header with Hamburger Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: '8px 16px',
          paddingTop: '74px',
        }}
      >
        {isOpen && <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Menu</span>}
        <IconButton onClick={toggleSidebar} sx={{ color: 'primary.main' }}>
          <MenuIcon />
        </IconButton>
      </Box>
      <Divider />

      {/* Sidebar Links */}
      <List>
        {/* MRD Files Link */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/" sx={{ padding: '10px 16px' }}>
            <ListItemIcon>
              <FaFile color="#011F5B" />
            </ListItemIcon>
            {isOpen && <ListItemText primary="MRD Files" />}
          </ListItemButton>
        </ListItem>

        {/* Images Link */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/images" sx={{ padding: '10px 16px' }}>
            <ListItemIcon>
              <FaImages color="#011F5B" />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Images" />}
          </ListItemButton>
        </ListItem>

        {/* Simulator Link */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/simulator" sx={{ padding: '10px 16px' }}>
            <ListItemIcon>
              <FaCube color="#011F5B" />
            </ListItemIcon>
            {isOpen && <ListItemText primary="Simulator" />}
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
    </Drawer>
  );
};

export default Sidebar;
