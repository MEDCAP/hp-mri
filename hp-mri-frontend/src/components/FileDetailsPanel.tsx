import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled
} from '@mui/material';
import {
  Close,
  Description,
  CalendarToday,
  AccessTime,
  Person,
  Category,
  Group,
  CheckCircle,
  Cancel,
  CloudDownload,
  Storage,
  Info
} from '@mui/icons-material';

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

const DetailItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(1, 0),
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const DetailLabel = styled('div')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: theme.spacing(0.25),
}));

const DetailValue = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: '1rem',
  fontWeight: 400,
}));

interface MRDFile {
  _id: { $oid: string };
  fileName: string;
  studyDate: string;
  studyTime: string;
  ownerName: string;
  subjectType: string;
  groupName: string;
  isReconstructed: boolean;
  protocolName?: string;
  measurementId?: string;
  stationName?: string;
  file_size?: string;
  upload_timestamp?: string;
  s3_key?: string;
}

interface FileDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  file: MRDFile | null;
}

const FileDetailsPanel: React.FC<FileDetailsPanelProps> = ({ open, onClose, file }) => {
  if (!file) return null;

  const formatFileSize = (size?: string) => {
    if (!size) return 'Unknown';
    const bytes = parseInt(size);
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDateTime = (date: string, time: string) => {
    if (date === 'unknown' || time === 'unknown') return 'Unknown';
    return `${date} at ${time}`;
  };

  const formatUploadTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    // Handle MongoDB date format
    if (timestamp.$date) {
      const date = new Date(timestamp.$date);
      return date.toLocaleString();
    }
    
    // Handle string format
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }
    
    // Handle Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    return 'Unknown';
  };

  const getFileIcon = () => {
    return <Description sx={{ fontSize: 40, color: 'primary.main' }} />;
  };

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
              {getFileIcon()}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25 }}>
                  {file.fileName}
                </Typography>
                <Chip 
                  label={file.isReconstructed ? 'Reconstructed' : 'Raw Data'} 
                  color={file.isReconstructed ? 'success' : 'default'}
                  size="small"
                  icon={file.isReconstructed ? <CheckCircle /> : <Cancel />}
                />
              </Box>
            </Box>
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
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip 
              label={file.groupName} 
              variant="outlined" 
              size="small"
              icon={<Group />}
            />
            <Chip 
              label={file.subjectType} 
              variant="outlined" 
              size="small"
              icon={<Person />}
            />
          </Box>
        </HeaderSection>

        {/* Content Section */}
        <ContentSection>
          <List sx={{ p: 0, '& .MuiListItem-root': { minHeight: 'auto' } }}>
            {/* Study Information */}
            <DetailItem>
              <ListItemIcon>
                <CalendarToday color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={<DetailLabel>Study Date & Time</DetailLabel>}
                secondary={<DetailValue>{formatDateTime(file.studyDate, file.studyTime)}</DetailValue>}
              />
            </DetailItem>

            <DetailItem>
              <ListItemIcon>
                <Person color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={<DetailLabel>Owner</DetailLabel>}
                secondary={<DetailValue>{file.ownerName}</DetailValue>}
              />
            </DetailItem>

            <DetailItem>
              <ListItemIcon>
                <Category color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={<DetailLabel>Subject Type</DetailLabel>}
                secondary={<DetailValue>{file.subjectType}</DetailValue>}
              />
            </DetailItem>

            {file.protocolName && (
              <DetailItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<DetailLabel>Protocol Name</DetailLabel>}
                  secondary={<DetailValue>{file.protocolName}</DetailValue>}
                />
              </DetailItem>
            )}

            {file.measurementId && (
              <DetailItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<DetailLabel>Measurement ID</DetailLabel>}
                  secondary={<DetailValue>{file.measurementId}</DetailValue>}
                />
              </DetailItem>
            )}

            {file.stationName && (
              <DetailItem>
                <ListItemIcon>
                  <Info color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<DetailLabel>Station Name</DetailLabel>}
                  secondary={<DetailValue>{file.stationName}</DetailValue>}
                />
              </DetailItem>
            )}

            <Divider sx={{ my: 1.5 }} />

            {/* File Information */}
            <DetailItem>
              <ListItemIcon>
                <Storage color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={<DetailLabel>File Size</DetailLabel>}
                secondary={<DetailValue>{formatFileSize(file.file_size)}</DetailValue>}
              />
            </DetailItem>

            {file.upload_timestamp && (
              <DetailItem>
                <ListItemIcon>
                  <AccessTime color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<DetailLabel>Upload Date</DetailLabel>}
                  secondary={<DetailValue>{formatUploadTimestamp(file.upload_timestamp)}</DetailValue>}
                />
              </DetailItem>
            )}

            {file.s3_key && (
              <DetailItem>
                <ListItemIcon>
                  <CloudDownload color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<DetailLabel>S3 Storage Key</DetailLabel>}
                  secondary={
                    <Typography variant="body2" sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.75rem',
                      wordBreak: 'break-all'
                    }}>
                      {file.s3_key}
                    </Typography>
                  }
                />
              </DetailItem>
            )}

            <Divider sx={{ my: 1.5 }} />

            {/* File ID */}
            <DetailItem>
              <ListItemIcon>
                <Info color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={<DetailLabel>File ID</DetailLabel>}
                secondary={
                  <Typography variant="body2" sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem'
                  }}>
                    {file._id.$oid}
                  </Typography>
                }
              />
            </DetailItem>
          </List>
        </ContentSection>
      </Box>
    </StyledDrawer>
  );
};

export default FileDetailsPanel; 