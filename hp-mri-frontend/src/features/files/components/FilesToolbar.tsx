import React from 'react';
import {
  Box,
  Button,
  TextField,
  Tooltip
} from '@mui/material';
import {
  CloudDownload,
  Delete,
  UploadFile,
  Refresh
} from '@mui/icons-material';

interface FilesToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  /** Guests only get search: the actions need a signed-in user. */
  showActions: boolean;
  onUploadClick: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  isAnyFileSelected: boolean;
}

const FilesToolbar: React.FC<FilesToolbarProps> = ({
  search,
  onSearchChange,
  showActions,
  onUploadClick,
  onRefresh,
  onDelete,
  isAnyFileSelected,
}) => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, marginBottom: 2 }}>
      <TextField
        sx={{ flex: '1 1 240px' }}
        variant="outlined"
        label="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {showActions && (
        <Box sx={{ display: 'flex', flex: '1 1 420px', gap: 1 }}>
          <Tooltip title="Upload new file">
            <Button variant="outlined" startIcon={<UploadFile />} onClick={onUploadClick} sx={{ flex: 1 }}>
              Upload
            </Button>
          </Tooltip>
          <Tooltip title="Refresh MRD files">
            <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh} sx={{ flex: 1 }}>
              Refresh
            </Button>
          </Tooltip>
          <Tooltip title="Delete selected files">
            <span style={{ flex: 1, display: 'flex' }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                disabled={!isAnyFileSelected}
                onClick={onDelete}
                sx={{ flex: 1 }}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Download selected files">
            <span style={{ flex: 1, display: 'flex' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudDownload />}
                disabled={!isAnyFileSelected}
                sx={{ flex: 1 }}
              >
                Download
              </Button>
            </span>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default FilesToolbar;
