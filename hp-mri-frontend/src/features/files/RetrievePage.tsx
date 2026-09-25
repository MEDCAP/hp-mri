import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import UploadModal from './components/UploadModal';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import UploadProgressModal from './components/UploadProgressModal';
import UploadCompletionModal from './components/UploadCompletionModal';
import { UploadFile } from './hooks/useUpload';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import FileDetailsPanel from './components/FileDetailsPanel';
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
import FilesToolbar from './components/FilesToolbar';
import FilesTable from './components/FilesTable';
import { SIDEBAR_OPEN_CONTENT_MARGIN, SIDEBAR_CLOSED_CONTENT_MARGIN } from '../../layouts/layoutConstants';

const DETAILS_PANEL_WIDTH = '400px';

const RetrievePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isSignedIn,
    search, setSearch,
    sortConfig, sortedFiles, selectedFiles,
    fetchFiles, handleSort,
    selectOnly, toggleSelected, clearSelection, removeFiles, patchFile,
  } = useFileList();
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

  const isGuest = !isSignedIn;
  const detailsPanelOpen = selectedFiles.length > 0;

  useEffect(() => {
    document.title = "MRD Files - HP";
  }, []);

  const handleRowDoubleClick = (file: MRDFile) => {
    navigate('/viewer', { state: { preloadFile: file } });
  };

  const handleDelete = () => {
    if (selectedFiles.length === 0) return;
    setFileDeleteStatuses(selectedFiles.map(file => ({
      fileName: file.fileName,
      status: 'pending' as const,
    })));
    setIsDeleting(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    const filesToDelete = selectedFiles;
    setIsDeleting(true);
    setFileDeleteStatuses(prev => prev.map(status => ({ ...status, status: 'deleting' as const })));

    try {
      const data = await deleteMrdFiles(filesToDelete.map(file => file._id));

      // Update file statuses based on backend response
      if (data.file_results) {
        const results = data.file_results;
        setFileDeleteStatuses(prev => prev.map(status => {
          const result = results.find(fr => fr.file_name === status.fileName);
          if (!result) return status;
          return {
            fileName: status.fileName,
            status: result.status === 'success' ? 'success' as const : 'error' as const,
            error: result.error,
          };
        }));
      }

      // Wait a moment to show the final statuses, then close dialog
      setTimeout(() => {
        setDeleteSuccess(data.message ?? null);
        setDeleteDialogOpen(false);
        setIsDeleting(false);
        removeFiles(filesToDelete.map(file => file._id));
        setTimeout(() => setDeleteSuccess(null), 5000);
      }, 1500);
    } catch (error) {
      console.error("Error deleting files:", error);
      const errorMessage = getApiErrorMessage(error) || "Failed to delete files";
      setFileDeleteStatuses(prev => prev.map(status => ({
        ...status,
        status: 'error' as const,
        error: errorMessage,
      })));

      setTimeout(() => {
        setDeleteError(errorMessage);
        setDeleteDialogOpen(false);
        setIsDeleting(false);
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
    fetchFiles();
  };

  const handleUploadStart = (files: UploadFile[]) => {
    if (files && files.length > 0) {
      setUploadFiles(files);
      setIsUploading(true);
      setIsMinimized(false);
      setIsUploadCompleted(false);
      setUploadCompletionModalOpen(false);
      const initialProgress: {[key: string]: number} = {};
      files.forEach(file => {
        initialProgress[file.id] = 0;
      });
      setUploadProgress(initialProgress);
    }
  };

  const handleProgressUpdate = (fileId: string, progress: number) => {
    setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
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
    const totalProgress = uploadFiles.reduce((sum, file) => sum + (uploadProgress[file.id] || 0), 0);
    return totalProgress / uploadFiles.length;
  };

  const sidebarMargin = isSidebarOpen ? SIDEBAR_OPEN_CONTENT_MARGIN : SIDEBAR_CLOSED_CONTENT_MARGIN;
  const panelMargin = detailsPanelOpen ? DETAILS_PANEL_WIDTH : '0px';

  return (
    <div
      style={{
        width: `calc(100% - ${sidebarMargin} - ${panelMargin})`,
        marginLeft: sidebarMargin,
        marginRight: panelMargin,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: 'calc(100vh - 72px)', // MRDLayout's fixed header
      }}
    >
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

        <FilesToolbar
          search={search}
          onSearchChange={setSearch}
          showActions={!isGuest}
          onUploadClick={() => {
            setIsUploadCompleted(false);
            setUploadCompletionModalOpen(false);
            setUploadProgressModalOpen(false);
            setUploadModalOpen(true);
          }}
          onRefresh={fetchFiles}
          onDelete={handleDelete}
          isAnyFileSelected={selectedFiles.length > 0}
        />

        <FilesTable
          sortedFiles={sortedFiles}
          sortConfig={sortConfig}
          showCheckboxes={!isGuest}
          onSort={handleSort}
          onRowClick={(file) => selectOnly(file._id)}
          onRowDoubleClick={handleRowDoubleClick}
          onToggle={toggleSelected}
        />
      </Container>

      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        onUploadStart={handleUploadStart}
        onMinimize={handleMinimize}
        isUploading={isUploading}
        onProgressUpdate={handleProgressUpdate}
      />

      <UploadProgressModal
        open={uploadProgressModalOpen}
        onClose={() => setUploadProgressModalOpen(false)}
        files={uploadFiles}
        overallProgress={calculateOverallProgress()}
        isUploading={isUploading}
        fileProgress={uploadProgress}
      />

      <UploadProgressIndicator
        files={uploadFiles}
        overallProgress={calculateOverallProgress()}
        isUploading={isUploading}
        onExpand={handleExpandProgress}
        isVisible={(isMinimized && uploadFiles.length > 0) || (isUploadCompleted && uploadFiles.length > 0)}
        isCompleted={isUploadCompleted}
      />

      <UploadCompletionModal
        open={uploadCompletionModalOpen}
        onClose={() => setUploadCompletionModalOpen(false)}
        files={uploadFiles}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete MRD Files"
        message={`Are you sure you want to permanently delete ${selectedFiles.length} selected file(s)? This action will remove the files from both the database and cloud storage, and cannot be undone.`}
        confirmText="confirm"
        filesToDelete={selectedFiles.map(f => f.fileName)}
        fileStatuses={fileDeleteStatuses}
        isDeleting={isDeleting}
      />

      <Snackbar
        open={!!uploadSuccess}
        autoHideDuration={6000}
        onClose={() => setUploadSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setUploadSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {uploadSuccess}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!deleteSuccess}
        autoHideDuration={6000}
        onClose={() => setDeleteSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setDeleteSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {deleteSuccess}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!deleteError}
        autoHideDuration={6000}
        onClose={() => setDeleteError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setDeleteError(null)} severity="error" sx={{ width: '100%' }}>
          {deleteError}
        </Alert>
      </Snackbar>

      <FileDetailsPanel
        selection={selectedFiles}
        onClose={clearSelection}
        onVisibilityChanged={(fileId, groupName) => patchFile(fileId, { groupName })}
      />
    </div>
  );
};

export default RetrievePage;
