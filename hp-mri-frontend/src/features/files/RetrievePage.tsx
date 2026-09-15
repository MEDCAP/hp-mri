import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../layouts/HeaderAccount';
import UploadModal from './components/UploadModal';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import UploadProgressModal from './components/UploadProgressModal';
import UploadCompletionModal from './components/UploadCompletionModal';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import FileDetailsPanel from './components/FileDetailsPanel';
import ReconstructModal from '../recon/ReconstructModal';
import {
  Container,
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import { deleteMrdFiles } from '../../api/mrdFiles';
import { getApiErrorMessage } from '../../api/client';
import { MRDFile } from '../../types/mrd';
import { useFileList } from './hooks/useFileList';
import { UploadFile } from './hooks/useUpload';
import FilesToolbar from './components/FilesToolbar';
import FilesTable from './components/FilesTable';
import { SIDEBAR_OPEN_CONTENT_MARGIN, SIDEBAR_CLOSED_CONTENT_MARGIN } from '../../layouts/layoutConstants';

const RetrievePage: React.FC = () => {
  const { files, setFiles, search, setSearch, sortConfig, sortedFiles, fetchFiles, handleSort, handleSelection } = useFileList();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProgressModalOpen, setUploadProgressModalOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
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
  const [reconstructModalOpen, setReconstructModalOpen] = useState(false);

  useEffect(() => {
    fetchFiles();
    document.title = "MRD Files - HP"; // Dynamically updates the tab title
  }, [fetchFiles]);

  const goToDetails = (file: MRDFile) => {
    setSelectedFile(file);
    setFileDetailsPanelOpen(true);
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
      const data = await deleteMrdFiles(selectedFileIds);

              // Update file statuses based on backend response
        if (data.file_results) {
          const updatedStatuses = fileDeleteStatuses.map(status => {
            const selectedFile = selectedFiles.find(f => f.fileName === status.fileName);
            const fileResult = data.file_results!.find((fr) =>
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
        setDeleteSuccess(data.message ?? null);
        setDeleteDialogOpen(false);
        setIsDeleting(false);

        // Remove the deleted files from the local state
        setFiles(files.filter(file => !file.isSelected));

        // Clear success message after 5 seconds
        setTimeout(() => setDeleteSuccess(null), 5000);
      }, 1500);

    } catch (error) {
      console.error("Error deleting files:", error);

      const errorMessage = getApiErrorMessage(error) || "Failed to delete files";

      // Set all files to error status
      setFileDeleteStatuses(prev => prev.map(status => ({
        ...status,
        status: 'error' as const,
        error: errorMessage
      })));

      setTimeout(() => {
        setDeleteError(errorMessage);
        setDeleteDialogOpen(false);
        setIsDeleting(false);

        // Clear error message after 5 seconds
        setTimeout(() => setDeleteError(null), 5000);
      }, 1500);
    }
  };

  const handleUploadComplete = (uploadedFiles: UploadFile[]) => {
    if (uploadedFiles && uploadedFiles.length > 0) {
      setUploadSuccess(`${uploadedFiles.length} files uploaded successfully!`);
    }
    setIsUploading(false);
    setIsUploadCompleted(true);
    fetchFiles(); // Refresh the file list
  };

  const handleUploadStart = (files: UploadFile[]) => {
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
          ? `calc(100% - ${SIDEBAR_OPEN_CONTENT_MARGIN} - ${fileDetailsPanelOpen ? '400px' : '0px'})`
          : `calc(100% - ${SIDEBAR_CLOSED_CONTENT_MARGIN} - ${fileDetailsPanelOpen ? '400px' : '0px'})`,
        marginLeft: isSidebarOpen ? SIDEBAR_OPEN_CONTENT_MARGIN : SIDEBAR_CLOSED_CONTENT_MARGIN,
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

        <FilesToolbar
          search={search}
          onSearchChange={setSearch}
          onUploadClick={() => {
            console.log('Upload button clicked');
            setIsUploadCompleted(false);
            setUploadCompletionModalOpen(false);
            setUploadProgressModalOpen(false);
            setUploadModalOpen(true);
          }}
          onReconstructClick={() => setReconstructModalOpen(true)}
          onRefresh={fetchFiles}
          onDelete={handleDelete}
          isAnyFileSelected={isAnyFileSelected}
        />

        <FilesTable
          sortedFiles={sortedFiles}
          sortConfig={sortConfig}
          onSort={handleSort}
          onSelect={handleSelection}
          onRowClick={goToDetails}
        />
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

      {/* Reconstruct Modal */}
      <ReconstructModal
        open={reconstructModalOpen}
        onClose={() => setReconstructModalOpen(false)}
        onReconstructStart={() => {
          console.log('Reconstruction started');
          // You can add success notification here if needed
        }}
      />
    </div>
  );
};

export default RetrievePage;
