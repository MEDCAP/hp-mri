import { useEffect } from 'react';
import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

interface FileWithPath {
  file: File;
  relativePath: string;
}

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
  useEffect(() => {
    document.title = "HP-MRI Web App";
  }, []);

  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = Array.from(event.target.files);
      const filesWithPaths: FileWithPath[] = fileList.map((file) => ({
        file,
        relativePath: (file as File & { webkitRelativePath: string }).webkitRelativePath || file.name,
      }));
      setFiles(filesWithPaths);
    }
  };

  const handleUpload = () => {
    const formData = new FormData();
    
    // Append files with their relative paths
    files.forEach((fileWithPath) => {
      formData.append('files', fileWithPath.file);
      formData.append('filePaths', fileWithPath.relativePath);
    });

    axios
      .post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(() => {
        setSuccessMessage('Files uploaded successfully!');
        setFiles([]);
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
            Select a folder to upload. All files will be discovered recursively.
          </Typography>

          <DragDropBox sx={{ width: '100%', maxWidth: '500px' }}>
            <label style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
              <Typography variant="h6" fontWeight="bold">
                Upload MRI Data Folder
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Click to select a folder
              </Typography>
              <input
                type="file"
                // @ts-expect-error webkitdirectory is a non-standard attribute
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderChange}
                style={{ display: 'none' }}
              />
            </label>
          </DragDropBox>

          {files.length > 0 && (
            <Box sx={{ width: '100%', maxWidth: '500px', mt: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Files to upload ({files.length}):
              </Typography>
              <List dense sx={{ maxHeight: '200px', overflow: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
                {files.map((fileWithPath, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={fileWithPath.relativePath}
                      secondary={`${(fileWithPath.file.size / 1024).toFixed(2)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default UploadPage;
