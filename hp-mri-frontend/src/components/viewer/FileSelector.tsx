import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  useTheme
} from '@mui/material';
import { 
  FileOpen,
  Close
} from '@mui/icons-material';
import { MRDFile } from '../../types/mrd';

interface FileSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MRDFile) => void;
  windowNumber: number;
  availableFiles: MRDFile[];
  filesLoading: boolean;
}

const FileSelector: React.FC<FileSelectorProps> = ({
  open,
  onClose,
  onSelect,
  windowNumber,
  availableFiles,
  filesLoading
}) => {
  const theme = useTheme();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      transitionDuration={300}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileOpen />
          <Typography variant="h6">Select MRD File for Window {windowNumber}</Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: theme.palette.primary.contrastText }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {filesLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading files...</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"></TableCell>
                  <TableCell>File Name</TableCell>
                  <TableCell>Study Date</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableFiles.map((file) => (
                  <TableRow 
                    key={file._id} 
                    hover 
                    onClick={() => onSelect(file)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell>{file.fileName}</TableCell>
                    <TableCell>{new Date(file.studyDate).toLocaleDateString()}</TableCell>
                    <TableCell>{file.ownerName}</TableCell>
                    <TableCell>{file.file_size ? `${(Number(file.file_size) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FileSelector;
