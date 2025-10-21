import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ open, onClose, onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.name.trim() || !formData.displayName.trim()) {
      setError('Group name and display name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/groups', {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim() || undefined
      });

      console.log('Group created successfully:', response.data);
      
      // Reset form
      setFormData({ name: '', displayName: '', description: '' });
      
      // Notify parent component
      onGroupCreated();
      
      // Close dialog
      onClose();
      
    } catch (error: any) {
      console.error('Error creating group:', error);
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to create group. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', displayName: '', description: '' });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create New Group
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ minWidth: 'auto', p: 0.5 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Group Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              fullWidth
              disabled={loading}
              placeholder="e.g., research-team"
              helperText="Unique identifier for the group (lowercase, no spaces)"
              variant="outlined"
              size="small"
            />

            <TextField
              label="Display Name"
              value={formData.displayName}
              onChange={handleInputChange('displayName')}
              required
              fullWidth
              disabled={loading}
              placeholder="e.g., Research Team"
              helperText="User-friendly name for the group"
              variant="outlined"
              size="small"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              disabled={loading}
              placeholder="Optional description of the group's purpose"
              multiline
              rows={3}
              variant="outlined"
              size="small"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.displayName.trim()}
            variant="contained"
            sx={{ textTransform: 'none' }}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateGroupDialog;
