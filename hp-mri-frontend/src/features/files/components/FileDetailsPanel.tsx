import React from 'react';
import {
  Drawer,
  Box,
  IconButton,
  styled
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MRDFile } from '../../../types/mrd';
import { FileDetailsTitle, FileDetailsChips, FileDetailsBody } from '../../../components/FileDetailsContent';

const drawerWidth = 400;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.default,
    borderLeft: `1px solid ${theme.palette.divider}`,
    zIndex: theme.zIndex.drawer,
    marginTop: '74px', // Account for the header height
    height: 'calc(100vh - 74px)', // Subtract header height
  },
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const ContentSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  overflowY: 'auto',
}));

interface FileDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  file: MRDFile | null;
}

const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({ open, onClose, file }) => {
  if (!file) return null;

  return (
    <StyledDrawer
      anchor="right"
      open={open}
      variant="permanent"
      sx={{
        '& .MuiDrawer-paper': {
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: open ? '0 0 20px rgba(0,0,0,0.1)' : 'none',
          zIndex: 1300,
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Section */}
        <HeaderSection>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <FileDetailsTitle file={file} />
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>

          <FileDetailsChips file={file} />
        </HeaderSection>

        {/* Content Section */}
        <ContentSection>
          <FileDetailsBody file={file} />
        </ContentSection>
      </Box>
    </StyledDrawer>
  );
};

export default FileDetailsPanel;
