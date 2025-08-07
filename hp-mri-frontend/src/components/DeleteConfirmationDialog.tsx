import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Alert,
  styled,
  CircularProgress
} from '@mui/material';
import { Warning, Delete, CheckCircle, Cancel } from '@mui/icons-material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: theme.shadows[24],
    maxWidth: 500,
    width: '100%',
    margin: 16,
  },
}));

interface FileDeleteStatus {
  fileName: string;
  status: 'pending' | 'deleting' | 'success' | 'error';
  error?: string;
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  filesToDelete?: string[];
  fileStatuses?: FileDeleteStatus[];
  isDeleting?: boolean;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "confirm",
  filesToDelete = [],
  fileStatuses = [],
  isDeleting = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setError('');
  };

  const handleConfirm = () => {
    if (inputValue.toLowerCase() === confirmText.toLowerCase()) {
      onConfirm();
      setInputValue('');
      setError('');
    } else {
      setError(`Please type "${confirmText}" to confirm deletion`);
    }
  };

  const handleClose = () => {
    setInputValue('');
    setError('');
    onClose();
  };

  const isConfirmEnabled = inputValue.toLowerCase() === confirmText.toLowerCase() && !isDeleting;

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        color: 'error.main',
        pb: 1
      }}>
        <Warning color="error" />
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="medium">
            This action cannot be undone!
          </Typography>
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {message}
        </Typography>

        {filesToDelete.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
              Files to be deleted ({filesToDelete.length}):
            </Typography>
            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
              {filesToDelete.map((fileName, index) => {
                const fileStatus = fileStatuses.find(status => status.fileName === fileName);
                const status = fileStatus?.status || 'pending';
                
                return (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 0.5,
                    py: 0.5
                  }}>
                    {status === 'pending' && (
                      <Box sx={{ width: 16, height: 16 }} />
                    )}
                    {status === 'deleting' && (
                      <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                    )}
                    {status === 'success' && (
                      <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />
                    )}
                    {status === 'error' && (
                      <Cancel sx={{ color: 'error.main', fontSize: 16 }} />
                    )}
                    <Typography 
                      variant="body2" 
                      color={status === 'error' ? 'error.main' : 'text.secondary'}
                      sx={{ 
                        textDecoration: status === 'error' ? 'line-through' : 'none',
                        opacity: status === 'success' ? 0.7 : 1
                      }}
                    >
                      {fileName}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          To confirm this permanent deletion, please type <strong>"{confirmText}"</strong> in the field below:
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder={`Type "${confirmText}" to confirm`}
          value={inputValue}
          onChange={handleInputChange}
          error={!!error}
          helperText={error}
          sx={{ mb: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!isDeleting && (
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={!isConfirmEnabled}
          startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <Delete />}
          sx={{ 
            minWidth: 120,
            background: 'error.main',
            '&:hover': {
              background: 'error.dark',
            },
            '&:disabled': {
              background: 'grey.300',
              color: 'grey.500'
            }
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete Permanently'}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default DeleteConfirmationDialog; 