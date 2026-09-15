import React from 'react';
import { formatFileSize, formatDateTime, formatUploadTimestamp } from '../utils/format';
import {
  Box,
  Typography,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled
} from '@mui/material';
import {
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
import { MRDFile } from '../types/mrd';

// Shared styled primitives for the MRD file-details metadata view. Used by both
// FileDetailsPanel (drawer) and FileDetailsModal (dialog) so the field rendering
// exists in exactly one place.
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

const getFileIcon = () => {
  return <Description sx={{ fontSize: 40, color: 'primary.main' }} />;
};

interface FileDetailsContentProps {
  file: MRDFile;
}

// File icon + name + reconstructed/raw status chip. Rendered identically in both
// the drawer and the dialog headers.
export const FileDetailsTitle: React.FC<FileDetailsContentProps> = ({ file }) => (
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
);

// Group + subject-type chips. `sx` lets each wrapper apply its own spacing
// (drawer: none, dialog: mt: 1).
export const FileDetailsChips: React.FC<FileDetailsContentProps & { sx?: object }> = ({
  file,
  sx
}) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ...sx }}>
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
);

// The metadata field list shared verbatim between the panel and the modal.
export const FileDetailsBody: React.FC<FileDetailsContentProps> = ({ file }) => (
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
          secondary={<DetailValue>{formatUploadTimestamp(file.upload_timestamp, 'Unknown')}</DetailValue>}
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
);
