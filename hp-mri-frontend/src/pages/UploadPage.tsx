import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import { Box, Button, Typography, TextField, Snackbar, Alert } from '@mui/material';
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
  transition: 'background-color 0.3s ease, border-color 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.secondary.main,
  },
}));

const UploadPage: React.FC = () => {
  const [mriFile, setMriFile] = useState<FileList | null>(null);
  const [auxFile, setAuxFile] = useState<FileList | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    type: string
  ) => {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      type === 'MRI' ? setMriFile(inputElement.files) : setAuxFile(inputElement.files);
    }
  };

  const handleUpload = () => {
    if (mriFile) {
      const formData = new FormData();
      Array.from(mriFile).forEach(file => formData.append('file', file));
      axios
        .post('http://127.0.0.1:5000/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        .then(() => {
          setSuccessMessage('Files uploaded successfully!');
        })
        .catch(err => {
          console.error(err);
          setSuccessMessage(null);
        });
    }
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Box
        className={`upload-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding={3}
      >
        <Box display="flex" justifyContent="flex-end" width="100%" maxWidth="1200px">
          <Button variant="contained" color="primary" onClick={handleUpload}>
            Upload
          </Button>
        </Box>
        <Typography variant="h1" gutterBottom>
          Upload MRD Files
        </Typography>
        {successMessage && (
          <Snackbar open autoHideDuration={6000} onClose={() => setSuccessMessage(null)}>
            <Alert onClose={() => setSuccessMessage(null)} severity="success">
              {successMessage}
            </Alert>
          </Snackbar>
        )}
        <Typography variant="body1" gutterBottom>
          Select from local file
        </Typography>
        <Box display="flex" flexDirection="column" gap={3} width="100%" maxWidth="600px">
          <DragDropBox>
            <Typography variant="body1" fontWeight="bold">
              Upload MRI raw data
            </Typography>
            <Typography variant="body2">drag and drop</Typography>
            <TextField
              type="file"
              inputProps={{
                accept: '.bin, .dat',
                multiple: true,
              }}
              onChange={(e) => handleFileChange(e, 'MRI')}
              sx={{ display: 'none' }}
            />
          </DragDropBox>
          <DragDropBox>
            <Typography variant="body1" fontWeight="bold">
              Upload aux raw data
            </Typography>
            <Typography variant="body2">drag and drop</Typography>
            <TextField
              type="file"
              inputProps={{
                accept: '.txt, .json',
                multiple: true,
              }}
              onChange={(e) => handleFileChange(e, 'Aux')}
              sx={{ display: 'none' }}
            />
          </DragDropBox>
        </Box>
      </Box>
    </Box>
  );
};

export default UploadPage;
