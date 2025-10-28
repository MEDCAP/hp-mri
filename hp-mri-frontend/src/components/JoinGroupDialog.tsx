import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close as CloseIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface JoinGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onGroupJoined: () => void;
}

interface SearchGroup {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  requestStatus?: 'pending' | 'approved' | 'denied' | 'member';
}

const JoinGroupDialog: React.FC<JoinGroupDialogProps> = ({ open, onClose, onGroupJoined }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setInviteCode('');
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
    setSuccess(null);
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/groups/join-by-code', {
        code: inviteCode.trim()
      });

      setSuccess(`Successfully joined ${response.data.displayName}!`);
      setInviteCode('');
      
      // Notify parent component
      onGroupJoined();
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error joining group:', error);
      setError(
        error.response?.data?.error || 
        'Failed to join group. Please check the invite code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const [searchResponse, requestsResponse] = await Promise.all([
        apiClient.get(`/groups/search?q=${encodeURIComponent(searchQuery)}`),
        apiClient.get('/groups/my-join-requests')
      ]);
      
      const groups = searchResponse.data.groups;
      const userRequests = requestsResponse.data.joinRequests;
      
      // Add request status to each group
      const groupsWithStatus = groups.map((group: SearchGroup) => {
        const request = userRequests.find((req: any) => req.groupName === group.name);
        return {
          ...group,
          requestStatus: request ? request.status : 'none'
        };
      });
      
      setSearchResults(groupsWithStatus);

    } catch (error: any) {
      console.error('Error searching groups:', error);
      setError('Failed to search groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (groupName: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/groups/${groupName}/join-requests`);
      
      setSuccess(`Join request submitted for ${displayName}. Waiting for admin approval.`);
      
      // Refresh search results to show updated status
      handleSearchGroups();

    } catch (error: any) {
      console.error('Error requesting to join:', error);
      console.error('Error response:', error.response?.data);
      setError(
        error.response?.data?.error || 
        'Failed to submit join request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async (groupName: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/groups/${groupName}/join-requests/withdraw`);
      setSuccess(`Join request withdrawn for ${displayName}.`);
      
      // Refresh search results to show updated status
      handleSearchGroups();

    } catch (error: any) {
      console.error('Error withdrawing request:', error);
      setError('Failed to withdraw join request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setInviteCode('');
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
            Join Group
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

      <DialogContent sx={{ px: 3, py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Join with Code" />
            <Tab label="Browse Groups" />
          </Tabs>
        </Box>

        {/* Tab 1: Join with Code */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Enter an invite code to join a group instantly
            </Typography>
            
            <TextField
              label="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              fullWidth
              disabled={loading}
              placeholder="e.g., A7K2M9Q4X"
              variant="outlined"
              size="small"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />

            <Button
              onClick={handleJoinByCode}
              disabled={loading || !inviteCode.trim()}
              variant="contained"
              fullWidth
              sx={{ textTransform: 'none' }}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Joining...' : 'Join Group'}
            </Button>
          </Box>
        )}

        {/* Tab 2: Browse Groups */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Search for groups and request to join
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Search groups"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                disabled={loading}
                placeholder="e.g., research, lab, team"
                variant="outlined"
                size="small"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchGroups();
                  }
                }}
              />
              <Button
                onClick={handleSearchGroups}
                disabled={loading}
                variant="outlined"
                startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
                sx={{ textTransform: 'none' }}
              >
                Search
              </Button>
            </Box>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Available Groups ({searchResults.length})
                </Typography>
                <List sx={{ p: 0 }}>
                  {searchResults.map((group) => (
                    <Card key={group._id} sx={{ mb: 1, boxShadow: 1 }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            <GroupIcon fontSize="small" />
                          </Avatar>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {group.displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {group.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip
                                label={`${group.memberCount} members`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem', height: 20 }}
                              />
                              {group.requestStatus === 'pending' && (
                                <Chip
                                  label="Request Pending"
                                  size="small"
                                  color="warning"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                              {group.requestStatus === 'approved' && (
                                <Chip
                                  label="Approved"
                                  size="small"
                                  color="success"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                              {group.requestStatus === 'denied' && (
                                <Chip
                                  label="Denied"
                                  size="small"
                                  color="error"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                              {group.requestStatus === 'member' && (
                                <Chip
                                  label="Member"
                                  size="small"
                                  color="primary"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                          
                          {group.requestStatus === 'none' && (
                            <Button
                              onClick={() => handleRequestToJoin(group.name, group.displayName)}
                              disabled={loading}
                              variant="outlined"
                              size="small"
                              sx={{ textTransform: 'none' }}
                            >
                              Request to Join
                            </Button>
                          )}
                          
                          {group.requestStatus === 'pending' && (
                            <Button
                              onClick={() => handleWithdrawRequest(group.name, group.displayName)}
                              disabled={loading}
                              variant="outlined"
                              color="warning"
                              size="small"
                              sx={{ textTransform: 'none' }}
                            >
                              Withdraw Request
                            </Button>
                          )}
                          
                          {(group.requestStatus === 'approved' || group.requestStatus === 'member') && (
                            <Button
                              disabled
                              variant="outlined"
                              color="success"
                              size="small"
                              sx={{ textTransform: 'none' }}
                            >
                              ✓ Joined
                            </Button>
                          )}
                          
                          {group.requestStatus === 'denied' && (
                            <Button
                              onClick={() => handleRequestToJoin(group.name, group.displayName)}
                              disabled={loading}
                              variant="outlined"
                              color="error"
                              size="small"
                              sx={{ textTransform: 'none' }}
                            >
                              Request Again
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </List>
              </Box>
            )}

            {searchResults.length === 0 && searchQuery && !loading && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No groups found matching "{searchQuery}"
                </Typography>
              </Box>
            )}
          </Box>
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

export default JoinGroupDialog;

