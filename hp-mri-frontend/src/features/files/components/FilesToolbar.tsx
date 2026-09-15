import React from 'react';
import {
  Button,
  Grid2,
  TextField,
  Tooltip
} from '@mui/material';
import {
  CloudDownload,
  Delete,
  UploadFile,
  Refresh,
  Build
} from '@mui/icons-material';

interface FilesToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onUploadClick: () => void;
  onReconstructClick: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  isAnyFileSelected: boolean;
}

const FilesToolbar: React.FC<FilesToolbarProps> = ({
  search,
  onSearchChange,
  onUploadClick,
  onReconstructClick,
  onRefresh,
  onDelete,
  isAnyFileSelected,
}) => {
  return (
    <Grid2 container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
      <Grid2 size={{xs: 6}}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Grid2>
      <Grid2 size={{xs: 6}} textAlign="right">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <Tooltip title="Upload new file">
            <Button
              variant="outlined"
              startIcon={<UploadFile />}
              onClick={onUploadClick}
              sx={{ flex: '1 1 19%', marginTop: '-8px' }}
            >
              Upload
            </Button>
          </Tooltip>
          <Tooltip title="Reconstruct MRD files">
            <Button
              variant="outlined"
              startIcon={<Build />}
              onClick={onReconstructClick}
              sx={{ flex: '1 1 19%', marginTop: '-8px' }}
            >
              Reconstruct
            </Button>
          </Tooltip>
          <Tooltip title="Refresh MRD files">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRefresh}
              sx={{
                flex: '1 1 19%',
                marginTop: '-8px'
              }}
            >
              Refresh
            </Button>
          </Tooltip>
          <Tooltip title="Delete selected files">
            <span>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                disabled={!isAnyFileSelected}
                onClick={onDelete}
                sx={{
                  flex: '1 1 19%',
                  marginTop: '-8px'
                }}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Download selected files">
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudDownload />}
                disabled={!isAnyFileSelected}
                sx={{
                  flex: '1 1 19%',
                  marginTop: '-8px'
                }}
              >
                Download
              </Button>
            </span>
          </Tooltip>
        </div>
      </Grid2>
    </Grid2>
  );
};

export default FilesToolbar;
