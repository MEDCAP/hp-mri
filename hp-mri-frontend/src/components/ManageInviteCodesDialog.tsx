import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
}

interface ManageInviteCodesDialogProps {
  open: boolean;
  onClose: () => void;
  groupName: string;
}

const ManageInviteCodesDialog: React.FC<ManageInviteCodesDialogProps> = ({ 
  open, 
  onClose, 
  groupName 
}) => {
  const theme = useTheme();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [expiresDays, setExpiresDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<number>(10);

  useEffect(() => {
    if (open) {
      loadInviteCodes();
    }
  }, [open, groupName]);

  const loadInviteCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/groups/${groupName}/invite-codes`);
      setInviteCodes(response.data.inviteCodes || []);
    } catch (error: any) {
      console.error('Error loading invite codes:', error);
      setError('Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInviteCode = async () => {
    try {
      setCreateLoading(true);
      setError(null);
      
      await apiClient.post(`/groups/${groupName}/invite-codes`, {
        expiresDays: expiresDays || undefined,
        maxUses: maxUses || undefined
      });
      
      setSuccess('Invite code created successfully!');
      loadInviteCodes(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating invite code:', error);
      setError('Failed to create invite code');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Code "${code}" copied to clipboard!`);
  };

  const handleRevokeCode = async (code: string) => {
    if (!window.confirm('Are you sure you want to revoke this invite code?')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupName}/invite-codes/${code}`);
      setSuccess('Invite code revoked successfully!');
      loadInviteCodes(); // Refresh the list
    } catch (error: any) {
      console.error('Error revoking invite code:', error);
      setError('Failed to revoke invite code');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getUsageStatus = (code: InviteCode) => {
    if (isExpired(code.expiresAt)) {
      return { label: 'Expired', color: 'error' as const };
    }
    if (code.maxUses && code.usedCount >= code.maxUses) {
      return { label: 'Used Up', color: 'warning' as const };
    }
    return { label: 'Active', color: 'success' as const };
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setExpiresDays(7);
    setMaxUses(10);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[10],
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Manage Invite Codes
          </Typography>
          <Chip 
            label={groupName} 
            size="small" 
            color="primary" 
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Create New Invite Code */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Create New Invite Code
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Expires in (days)"
              type="number"
              value={expiresDays}
              onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)}
              size="small"
              sx={{ width: 150 }}
              helperText="Leave empty for no expiration"
            />
            <TextField
              label="Max uses"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              size="small"
              sx={{ width: 150 }}
              helperText="Leave empty for unlimited"
            />
          </Box>
          
          <Button
            variant="contained"
            startIcon={createLoading ? <CircularProgress size={16} /> : <AddIcon />}
            onClick={handleCreateInviteCode}
            disabled={createLoading}
            sx={{ textTransform: 'none' }}
          >
            {createLoading ? 'Creating...' : 'Create Invite Code'}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Existing Invite Codes */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Existing Invite Codes ({inviteCodes.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : inviteCodes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No invite codes created yet.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {inviteCodes.map((code, index) => {
              const usageStatus = getUsageStatus(code);
              return (
                <React.Fragment key={code.code}>
                  <ListItem
                    sx={{
                      px: 0,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04)
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                            {code.code}
                          </Typography>
                          <Chip
                            label={usageStatus.label}
                            size="small"
                            color={usageStatus.color}
                            sx={{ fontSize: '0.75rem', height: 20 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Created {formatDate(code.createdAt)}
                            {code.expiresAt && (
                              <>
                                {' • '}
                                <TimeIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                Expires {formatDate(code.expiresAt)}
                              </>
                            )}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                              icon={<PeopleIcon />}
                              label={`${code.usedCount}${code.maxUses ? `/${code.maxUses}` : ''} uses`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem', height: 20 }}
                            />
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyCode(code.code)}
                          title="Copy code"
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRevokeCode(code.code)}
                          title="Revoke code"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < inviteCodes.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageInviteCodesDialog;
