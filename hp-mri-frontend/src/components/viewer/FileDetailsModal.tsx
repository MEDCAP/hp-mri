import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
import { MRDFile } from '../../types/mrd';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    backgroundColor: theme.palette.background.default,
  },
}));

// const HeaderSection = styled(Box)(({ theme }) => ({
//   padding: theme.spacing(0, 0, 2, 0),
//   borderBottom: `1px solid ${theme.palette.divider}`,
//   backgroundColor: theme.palette.background.paper,
// }));

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

interface FileDetailsModalProps {
  open: boolean;
  onClose: () => void;
  file: MRDFile | null;
}

const FileDetailsModal: React.FC<FileDetailsModalProps> = ({ open, onClose, file }) => {
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
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            position: 'absolute',
            right: 8,
            top: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            }
          }}
        >
          <Close />
        </IconButton>
        
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
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
      </DialogTitle>

      <DialogContent>
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
                  {file._id}
                </Typography>
              }
            />
          </DetailItem>
        </List>
      </DialogContent>
    </StyledDialog>
  );
};

export default FileDetailsModal;
