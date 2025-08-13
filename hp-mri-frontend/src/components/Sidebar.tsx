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
  useTheme
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';


interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  background_black?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, background_black = false }) => {
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  const theme = useTheme()
  const location = useLocation();
  const isMrdSelected = location.pathname.startsWith('/mrd-files');
  const isViewerSelected = location.pathname.startsWith('/viewer');
  const isSimulatorSelected = location.pathname.startsWith('/simulator');

  const getIconColor = (selected: boolean) => {
    if (background_black) return theme.palette.common.white;
    return selected ? theme.palette.common.white : '#011F5B';
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
          backgroundColor: background_black ? theme.palette.common.black : theme.palette.background.default,
          color: background_black ? theme.palette.common.white : 'inherit',
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
          backgroundColor: background_black ? theme.palette.common.black : theme.palette.background.default,
          color: background_black ? theme.palette.common.white : 'inherit'
        }}
      >
        {isOpen && (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: background_black ? theme.palette.common.white : 'primary.main', marginTop: '5px' }}>
            Menu
          </Typography>
        )}
        <IconButton onClick={toggleSidebar} sx={{ color: background_black ? theme.palette.common.white : 'primary.main', top: '2.5px' }}>
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
                backgroundColor: background_black ? alpha(theme.palette.common.white, 0.08) : theme.palette.action.hover,
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: background_black ? alpha(theme.palette.primary.main, 0.9) : theme.palette.primary.dark,
              },
              '& .MuiListItemText-primary': {
                color: isMrdSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaFile color={getIconColor(isMrdSelected)} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="MRD Files"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isMrdSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit') },
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
                backgroundColor: background_black ? alpha(theme.palette.common.white, 0.08) : theme.palette.action.hover,
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: background_black ? alpha(theme.palette.primary.main, 0.9) : theme.palette.primary.dark,
              },
              '& .MuiListItemText-primary': {
                color: isViewerSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaImages color={getIconColor(isViewerSelected)} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Viewer"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isViewerSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit') },
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
                backgroundColor: background_black ? alpha(theme.palette.common.white, 0.08) : theme.palette.action.hover,
              },
              '&.Mui-selected': {
                backgroundColor: '#011F5B',
                color: '#fff',
              },
              '&.Mui-selected:hover': {
                backgroundColor: background_black ? alpha(theme.palette.primary.main, 0.9) : theme.palette.primary.dark,
              },
              '& .MuiListItemText-primary': {
                color: isSimulatorSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit'),
              },
            }}
          >
            <ListItemIcon sx={{ justifyContent: 'center' }}>
              <FaCube color={getIconColor(isSimulatorSelected)} style={{ marginLeft: isOpen ? '0px' : '-5px' }} />
            </ListItemIcon>
            {isOpen && (
              <ListItemText
                primary="Simulator"
                primaryTypographyProps={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  sx: { color: isSimulatorSelected ? theme.palette.common.white : (background_black ? theme.palette.common.white : 'inherit') },
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
