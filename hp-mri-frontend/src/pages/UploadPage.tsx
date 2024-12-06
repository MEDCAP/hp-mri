import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const DragDropBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: 8,
  padding: '30px',
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.default,
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.secondary.main,
  },
}));

const UploadPage: React.FC = () => {
  const [mriFile, setMriFile] = useState<FileList | null>(null);
  const [auxFile, setAuxFile] = useState<FileList | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    if (event.target.files) {
      type === 'MRI' ? setMriFile(event.target.files) : setAuxFile(event.target.files);
    }
  };

  const handleUpload = () => {
    const formData = new FormData();
    if (mriFile) {
      Array.from(mriFile).forEach((file) => formData.append('mriFiles', file));
    }
    if (auxFile) {
      Array.from(auxFile).forEach((file) => formData.append('auxFiles', file));
    }

    axios
      .post('http://127.0.0.1:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(() => {
        setSuccessMessage('Files uploaded successfully!');
      })
      .catch((err) => {
        console.error(err);
        setSuccessMessage(null);
      });
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Box
        sx={{
          marginLeft: isSidebarOpen ? '520px' : '340px',
          transition: 'margin-left 0.3s',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '800px',
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
            marginBottom={4}
          >
            <Typography variant="h4" fontWeight="bold">
              Upload MRD Files
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              sx={{ padding: '10px 20px' }}
            >
              Upload
            </Button>
          </Box>

          {successMessage && (
            <Snackbar
              open
              autoHideDuration={6000}
              onClose={() => setSuccessMessage(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setSuccessMessage(null)}
                severity="success"
                sx={{ width: '100%' }}
              >
                {successMessage}
              </Alert>
            </Snackbar>
          )}

          <Typography variant="body1" color="textSecondary" sx={{ marginBottom: 2 }}>
            Select and upload your files below:
          </Typography>

          <Box
            display="flex"
            flexDirection={{ xs: 'column', md: 'row' }}
            gap={4}
            justifyContent="center"
            alignItems="center"
            width="100%"
          >
            <DragDropBox>
              <label style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                <Typography variant="h6" fontWeight="bold">
                  Upload MRI Raw Data
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Drag and drop or select files
                </Typography>
                <input
                  type="file"
                  accept=".bin, .dat"
                  multiple
                  onChange={(e) => handleFileChange(e, 'MRI')}
                  style={{ display: 'none' }}
                />
              </label>
            </DragDropBox>

            <DragDropBox>
              <label style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                <Typography variant="h6" fontWeight="bold">
                  Upload Aux Raw Data
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Drag and drop or select files
                </Typography>
                <input
                  type="file"
                  accept=".txt, .json"
                  multiple
                  onChange={(e) => handleFileChange(e, 'Aux')}
                  style={{ display: 'none' }}
                />
              </label>
            </DragDropBox>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default UploadPage;
