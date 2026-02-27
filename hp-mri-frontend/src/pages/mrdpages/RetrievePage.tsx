import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import UploadModal from '../../components/UploadModal';
import UploadProgressIndicator from '../../components/UploadProgressIndicator';
import UploadProgressModal from '../../components/UploadProgressModal';
import UploadCompletionModal from '../../components/UploadCompletionModal';
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog';
import FileDetailsPanel from '../../components/FileDetailsPanel';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Grid2,
  Paper,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  CloudDownload,
  Delete,
  UploadFile,
  Refresh,
  InfoOutlined,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import apiClient from '../../api/apiClient';
import { MRDFile } from '../../types/mrd';
import { isAuthenticated } from '../loginpages/cognitoUtils';

const formatStudyTime = (timeString: string) => {
  if (!timeString || !timeString.includes(':')) return '';
  const [hour, minute] = timeString.split(':');
  let h = parseInt(hour, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12; // Convert hour to 12-hour format, with 12 for midnight/noon
  return `${h}:${minute}${suffix}`;
};

// Helper to format MongoDB upload_timestamp into a readable string
const formatUploadTimestamp = (ts: any): string => {
  if (!ts) return '';
  let date: Date | null = null;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    date = isNaN(d.valueOf()) ? null : d;
  } else if (ts && ts.$date) {
    const d = new Date(ts.$date);
    date = isNaN(d.valueOf()) ? null : d;
  }
  return date ? date.toLocaleString() : '';
};

// Helper to extract Date for sorting
const extractUploadDate = (ts: any): Date => {
  if (!ts) return new Date(0);
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.valueOf()) ? new Date(0) : d;
  }
  if (ts.$date) {
    const d = new Date(ts.$date);
    return isNaN(d.valueOf()) ? new Date(0) : d;
  }
  return new Date(0);
};

const RetrievePage: React.FC = () => {
  const navigate = useNavigate();
  const [isGuest, setIsGuest] = useState(() => !isAuthenticated());
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof MRDFile; direction: 'asc' | 'desc' }>({
    key: 'fileName',
    direction: 'desc',
  });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProgressModalOpen, setUploadProgressModalOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploadCompleted, setIsUploadCompleted] = useState(false);
  const [uploadCompletionModalOpen, setUploadCompletionModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [fileDeleteStatuses, setFileDeleteStatuses] = useState<Array<{fileName: string; status: 'pending' | 'deleting' | 'success' | 'error'; error?: string}>>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileDetailsPanelOpen, setFileDetailsPanelOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MRDFile | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const fetchFiles = (guest: boolean) => {
    const endpoint = guest ? '/mrd-files/public' : '/mrd-files';
    apiClient.get(endpoint)
      .then((response) => {
        const validFiles = response.data.filter((file: MRDFile) => {
          if (file && file._id) return true;
          console.warn('Filtering out invalid file object:', file);
          return false;
        });
        setFiles(validFiles);
      })
      .catch((error) => console.error('Error fetching MRD files:', error));
  };

  // Re-fetch and update guest status whenever auth state changes (e.g. sign out)
  useEffect(() => {
    const handleAuthChange = () => {
      const newIsGuest = !isAuthenticated();
      setIsGuest(newIsGuest);
      setFiles([]); // clear stale files immediately
      fetchFiles(newIsGuest);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  useEffect(() => {
    fetchFiles(isGuest);
    document.title = "MRD Files - HP";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFiles = useMemo(() => {
    if (!search) {
        return files;
    }
    const lowercasedFilter = search.toLowerCase();
    return files.filter(
        (file) =>
            // Search by filename, subject type, or owner name
            (file.fileName || '').toLowerCase().includes(lowercasedFilter) ||
            (file.subjectType || '').toLowerCase().includes(lowercasedFilter) ||
            (file.ownerName || '').toLowerCase().includes(lowercasedFilter)
    );
}, [files, search]);

  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;
    const aValue =
      key === 'studyDate'
        ? new Date(a.studyDate || '')
        : key === 'upload_timestamp'
        ? extractUploadDate(a.upload_timestamp)
        : (a as any)[key] || '';
    const bValue =
      key === 'studyDate'
        ? new Date(b.studyDate || '')
        : key === 'upload_timestamp'
        ? extractUploadDate(b.upload_timestamp)
        : (b as any)[key] || '';
    return aValue < bValue
      ? sortConfig.direction === 'asc'
        ? -1
        : 1
      : sortConfig.direction === 'asc'
        ? 1
        : -1;
  });

  const handleSort = (key: keyof MRDFile) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file._id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  };

  const goToDetails = (file: MRDFile) => {
    setSelectedFile(file);
    setFileDetailsPanelOpen(true);
    setActiveFileId(file._id);
  };

  const handleRowClick = (file: MRDFile) => {
    setActiveFileId(file._id);
    // Select this file exclusively for action buttons (mirrors Windows Explorer single-click)
    setFiles(prev => prev.map(f => ({ ...f, isSelected: f._id === file._id })));
    if (fileDetailsPanelOpen) {
      setSelectedFile(file); // live-update panel without reopening
    }
  };

  const handleRowDoubleClick = (file: MRDFile) => {
    navigate('/viewer', { state: { preloadFile: file } });
  };

  const isAnyFileSelected = files.some((file) => file.isSelected);

  const handleDelete = () => {
    const selectedFiles = files.filter(file => file.isSelected);
    if (selectedFiles.length === 0) return;
    
    // Initialize file statuses
    const initialStatuses = selectedFiles.map(file => ({
      fileName: file.fileName,
      status: 'pending' as const,
      error: undefined
    }));
    setFileDeleteStatuses(initialStatuses);
    setIsDeleting(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    const selectedFileIds = files.filter(file => file.isSelected).map(file => file._id);
    const selectedFiles = files.filter(file => file.isSelected);
    
    setIsDeleting(true);
    
    // Set all files to deleting status
    setFileDeleteStatuses(prev => prev.map(status => ({
      ...status,
      status: 'deleting' as const
    })));
    
    try {
      const response = await axios.delete('/api/mrd-file', { 
        data: { ids: selectedFileIds } 
      });
      
              // Update file statuses based on backend response
        if (response.data.file_results) {
          const updatedStatuses = fileDeleteStatuses.map(status => {
            const selectedFile = selectedFiles.find(f => f.fileName === status.fileName);
            const fileResult = response.data.file_results.find((fr: any) => 
              selectedFile && fr.file_name === selectedFile.fileName
            );
            
            if (fileResult) {
              return {
                fileName: status.fileName,
                status: (fileResult.status === 'success' ? 'success' : 'error') as 'success' | 'error',
                error: fileResult.error
              };
            }
            return status;
          });
          
          setFileDeleteStatuses(updatedStatuses);
        }
      
      // Wait a moment to show the final statuses, then close dialog
      setTimeout(() => {
        setDeleteSuccess(response.data.message);
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        
        // Remove the deleted files from the local state
        setFiles(files.filter(file => !file.isSelected));
        
        // Clear success message after 5 seconds
        setTimeout(() => setDeleteSuccess(null), 5000);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error deleting files:", error);
      
      // Set all files to error status
      setFileDeleteStatuses(prev => prev.map(status => ({
        ...status,
        status: 'error' as const,
        error: error.response?.data?.error || "Failed to delete files"
      })));
      
      setTimeout(() => {
        setDeleteError(error.response?.data?.error || "Failed to delete files");
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        
        // Clear error message after 5 seconds
        setTimeout(() => setDeleteError(null), 5000);
      }, 1500);
    }
  };

  const handleUploadComplete = (uploadedFiles: any[]) => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      setUploadSuccess(`${uploadedFiles.length} files uploaded successfully!`);
    }
    setIsUploading(false);
    setIsUploadCompleted(true);
    fetchFiles(isGuest); // Refresh the file list
  };

  const handleUploadStart = (files: any[]) => {
    if (files && files.length > 0) {
      setUploadFiles(files);
      setIsUploading(true);
      setIsMinimized(false);
      setIsUploadCompleted(false);
      setUploadCompletionModalOpen(false);
      // Initialize progress for all files
      const initialProgress: {[key: string]: number} = {};
      files.forEach(file => {
        initialProgress[file.id] = 0;
      });
      setUploadProgress(initialProgress);
    }
  };

  const handleProgressUpdate = (fileId: string, progress: number) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: progress
    }));
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setUploadModalOpen(false);
  };

  const handleExpandProgress = () => {
    if (isUploadCompleted) {
      setUploadCompletionModalOpen(true);
    } else {
      setUploadProgressModalOpen(true);
    }
  };

  const calculateOverallProgress = () => {
    if (!uploadFiles || uploadFiles.length === 0) return 0;
    const totalProgress = uploadFiles.reduce((sum, file) => {
      return sum + (uploadProgress[file.id] || 0);
    }, 0);
    return totalProgress / uploadFiles.length;
  };

  return (
    <div
      style={{
        width: isSidebarOpen 
          ? `calc(100% - 260px - ${fileDetailsPanelOpen ? '400px' : '0px'})` 
          : `calc(100% - 80px - ${fileDetailsPanelOpen ? '400px' : '0px'})`,
        marginLeft: isSidebarOpen ? '260px' : '80px',
        marginRight: fileDetailsPanelOpen ? '400px' : '0px',
        marginTop: '64px',  // margin top between the header and app 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: 'calc(100vh - 74px)', // Account for header
      }}
    >
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <Container maxWidth="lg" sx={{ paddingTop: 2 }}>
        <Typography variant="h4" gutterBottom>
          Retrieve MRD Files
        </Typography>

        {isGuest && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Browsing public files in read-only mode.{' '}
            <a href="/account" style={{ fontWeight: 600 }}>Sign in</a> to upload, download, or manage files.
          </Alert>
        )}

        <Grid2 container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
          <Grid2 size={{xs: isGuest ? 12 : 6}}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
            </Box>
          </Grid2>
          {!isGuest && (
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
                    onClick={() => {
                      setIsUploadCompleted(false);
                      setUploadCompletionModalOpen(false);
                      setUploadProgressModalOpen(false);
                      setUploadModalOpen(true);
                    }}
                    sx={{ flex: '1 1 24%', marginTop: '-8px' }}
                  >
                    Upload
                  </Button>
                </Tooltip>
                <Tooltip title="Refresh MRD files">
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => fetchFiles(isGuest)}
                    sx={{ flex: '1 1 24%', marginTop: '-8px' }}
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
                      onClick={handleDelete}
                      sx={{ flex: '1 1 24%', marginTop: '-8px' }}
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
                      sx={{ flex: '1 1 24%', marginTop: '-8px' }}
                    >
                      Download
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </Grid2>
          )}
        </Grid2>

        <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {!isGuest && <TableCell />}
                {[{ key: 'fileName', label: 'File Name' }, { key: 'studyDate', label: 'Study Date' }, { key: 'upload_timestamp', label: 'Upload Date' }, { key: 'ownerName', label: 'Owner Name' }].map(({ key, label }) => (
                  <TableCell key={key} onClick={() => handleSort(key as keyof MRDFile)} sx={{ cursor: 'pointer' }}>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {label}{' '}
                      {sortConfig.key === (key as keyof MRDFile) && (
                        <IconButton
                          size="small"
                          sx={{
                            padding: 0,
                            marginLeft: 0.5,
                            verticalAlign: 'middle',
                            transform: 'translateY(0px)',
                          }}
                        >
                          {sortConfig.direction === 'asc' ? (
                            <ArrowUpward fontSize="small" />
                          ) : (
                            <ArrowDownward fontSize="small" />
                          )}
                        </IconButton>
                      )}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedFiles.map((file) => (
                <TableRow
                  key={file._id}
                  onClick={() => handleRowClick(file)}
                  onDoubleClick={() => handleRowDoubleClick(file)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: file._id === activeFileId ? alpha('#011F5B', 0.13) : 'inherit',
                    '&:hover': {
                      backgroundColor: file._id === activeFileId ? alpha('#011F5B', 0.18) : '#f1f1f1',
                    },
                  }}
                >
                  {!isGuest && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={file.isSelected}
                        onChange={() => handleSelection(file._id)}
                        color="primary"
                      />
                    </TableCell>
                  )}
                  <TableCell>{file.fileName}</TableCell>
                  <TableCell>{`${file.studyDate} ${formatStudyTime(file.studyTime)}`}</TableCell>
                  <TableCell>{formatUploadTimestamp(file.upload_timestamp)}</TableCell>
                  <TableCell>{file.ownerName}</TableCell>
                  <TableCell align="right" sx={{ pr: 1 }}>
                    <Tooltip title="View file details">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetails(file);
                        }}
                      >
                        <InfoOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        onUploadStart={handleUploadStart}
        onMinimize={handleMinimize}
        isUploading={isUploading}
        onProgressUpdate={handleProgressUpdate}
      />

      {/* Upload Progress Modal */}
      <UploadProgressModal
        open={uploadProgressModalOpen}
        onClose={() => setUploadProgressModalOpen(false)}
        files={uploadFiles}
        overallProgress={calculateOverallProgress()}
        isUploading={isUploading}
        fileProgress={uploadProgress}
      />

      {/* Minimized Progress Indicator */}
      <UploadProgressIndicator
        files={uploadFiles}
        overallProgress={calculateOverallProgress()}
        isUploading={isUploading}
        onExpand={handleExpandProgress}
        isVisible={(isMinimized && uploadFiles.length > 0) || (isUploadCompleted && uploadFiles.length > 0)}
        isCompleted={isUploadCompleted}
      />

      {/* Upload Completion Modal */}
      <UploadCompletionModal
        open={uploadCompletionModalOpen}
        onClose={() => setUploadCompletionModalOpen(false)}
        files={uploadFiles}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete MRD Files"
        message={`Are you sure you want to permanently delete ${files.filter(f => f.isSelected).length} selected file(s)? This action will remove the files from both the database and cloud storage, and cannot be undone.`}
        confirmText="confirm"
        filesToDelete={files.filter(f => f.isSelected).map(f => f.fileName)}
        fileStatuses={fileDeleteStatuses}
        isDeleting={isDeleting}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={!!uploadSuccess}
        autoHideDuration={6000}
        onClose={() => setUploadSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setUploadSuccess(null)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {uploadSuccess}
        </Alert>
      </Snackbar>

      {/* Delete Success Snackbar */}
      <Snackbar
        open={!!deleteSuccess}
        autoHideDuration={6000}
        onClose={() => setDeleteSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDeleteSuccess(null)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {deleteSuccess}
        </Alert>
      </Snackbar>

      {/* Delete Error Snackbar */}
      <Snackbar
        open={!!deleteError}
        autoHideDuration={6000}
        onClose={() => setDeleteError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDeleteError(null)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {deleteError}
        </Alert>
      </Snackbar>

      {/* File Details Panel */}
      <FileDetailsPanel
        open={fileDetailsPanelOpen}
        onClose={() => {
          setFileDetailsPanelOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
      />

    </div>
  );
};

export default RetrievePage;
