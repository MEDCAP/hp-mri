import React from 'react';
import { FaCube, FaFile, FaImages } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
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
  background_black?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, background_black = false }) => {
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const location = useLocation();
  const isMrdSelected = location.pathname.startsWith('/mrd-files');
  const isViewerSelected = location.pathname.startsWith('/viewer');
  const isSimulatorSelected = location.pathname.startsWith('/simulator');

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
          backgroundColor: background_black ? '#000' : 'background.default',
          color: background_black ? '#fff' : 'inherit',
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: 'flex',
          marginTop: '14px',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: '16px',
          paddingTop: '64px',
          backgroundColor: background_black ? '#000' : 'background.default',
          color: background_black ? '#fff' : 'inherit'
        }}
      >
        {isOpen && (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: background_black ? '#fff' : 'primary.main', marginTop: '5px' }}>
            Menu
          </Typography>
        )}
        <IconButton onClick={toggleSidebar} sx={{ color: background_black ? '#fff' : 'primary.main', top: '2.5px' }}>
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
            to="/mrd-files"
            selected={isMrdSelected}
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'background.light',
              },
              '& .MuiListItemText-primary': {
                color: isMrdSelected ? '#fff' : (background_black ? '#fff' : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaFile color={isMrdSelected ? '#fff' : (background_black ? '#fff' : (isOpen ? '#011F5B' : 'inherit'))} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="MRD Files"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isMrdSelected ? '#fff' : (background_black ? '#fff' : 'inherit') },
                }}
              />
            )}
          </ListItemButton>
        </ListItem>

        {/* Images Link */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/viewer"
            selected={isViewerSelected}
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'background.light',
              },
              '& .MuiListItemText-primary': {
                color: isViewerSelected ? '#fff' : (background_black ? '#fff' : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaImages color={isViewerSelected ? '#fff' : (background_black ? '#fff' : (isOpen ? '#011F5B' : 'inherit'))} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Viewer"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isViewerSelected ? '#fff' : (background_black ? '#fff' : 'inherit') },
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
            selected={isSimulatorSelected}
            sx={{
              padding: '10px 16px',
              '&:hover': {
                backgroundColor: 'background.light',
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: 'background.light',
              },
              '& .MuiListItemText-primary': {
                color: isSimulatorSelected ? '#fff' : (background_black ? '#fff' : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaCube color={isSimulatorSelected ? '#fff' : (background_black ? '#fff' : (isOpen ? '#011F5B' : 'inherit'))} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Simulator"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isSimulatorSelected ? '#fff' : (background_black ? '#fff' : 'inherit') },
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
