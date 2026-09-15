import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  styled
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MRDFile } from '../../../types/mrd';
import { FileDetailsTitle, FileDetailsChips, FileDetailsBody } from '../../../components/FileDetailsContent';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    backgroundColor: theme.palette.background.default,
  },
}));

interface FileDetailsModalProps {
  open: boolean;
  onClose: () => void;
  file: MRDFile | null;
}

const FileDetailsModal: React.FC<FileDetailsModalProps> = ({ open, onClose, file }) => {
  if (!file) return null;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <FileDetailsTitle file={file} />
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
            }
          }}
        >
          <Close />
        </IconButton>

        <FileDetailsChips file={file} sx={{ mt: 1 }} />
      </DialogTitle>

      <DialogContent>
        <FileDetailsBody file={file} />
      </DialogContent>
    </StyledDialog>
  );
};

export default FileDetailsModal;
