import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface JoinRequest {
  userSub: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
}

interface JoinRequestsPanelProps {
  groupName: string;
  isAdmin: boolean;
}

const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ groupName, isAdmin }) => {
  const theme = useTheme();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && groupName) {
      loadJoinRequests();
    }
  }, [groupName, isAdmin]);

  const loadJoinRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('DEBUG: Loading join requests for group:', groupName);
      const response = await apiClient.get(`/groups/${groupName}/join-requests`);
      console.log('DEBUG: Join requests response:', response.data);
      setRequests(response.data.joinRequests);
    } catch (error: any) {
      console.error('Error loading join requests:', error);
      setError('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userSub: string, userName: string) => {
    try {
      setActionLoading(userSub);
      
      await apiClient.post(`/groups/${groupName}/join-requests/${userSub}/approve`);
      
      // Update the request status locally
      setRequests(prev => prev.map(req => 
        req.userSub === userSub 
          ? { ...req, status: 'approved' as const }
          : req
      ));
      
    } catch (error: any) {
      console.error('Error approving request:', error);
      setError('Failed to approve join request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (userSub: string, userName: string) => {
    try {
      setActionLoading(userSub);
      
      await apiClient.post(`/groups/${groupName}/join-requests/${userSub}/deny`);
      
      // Update the request status locally
      setRequests(prev => prev.map(req => 
        req.userSub === userSub 
          ? { ...req, status: 'denied' as const }
          : req
      ));
      
    } catch (error: any) {
      console.error('Error denying request:', error);
      setError('Failed to deny join request');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'denied': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AccessTimeIcon fontSize="small" />;
      case 'approved': return <CheckCircleIcon fontSize="small" />;
      case 'denied': return <CancelIcon fontSize="small" />;
      default: return null;
    }
  };

  if (!isAdmin) {
    return null;
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Join Requests
        </Typography>
        {pendingRequests.length > 0 && (
          <Chip
            label={`${pendingRequests.length} pending`}
            color="warning"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Card variant="outlined" sx={{ textAlign: 'center', py: 3 }}>
          <CardContent>
            <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No join requests yet
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'warning.main' }}>
                Pending Approval ({pendingRequests.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {pendingRequests.map((request) => (
                  <Card key={request.userSub} sx={{ mb: 1, boxShadow: 1 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {request.userName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {request.userEmail}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Requested {formatDate(request.requestedAt)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            onClick={() => handleApprove(request.userSub, request.userName)}
                            disabled={actionLoading === request.userSub}
                            variant="contained"
                            size="small"
                            color="success"
                            startIcon={actionLoading === request.userSub ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                            sx={{ textTransform: 'none' }}
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleDeny(request.userSub, request.userName)}
                            disabled={actionLoading === request.userSub}
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={actionLoading === request.userSub ? <CircularProgress size={16} /> : <CancelIcon />}
                            sx={{ textTransform: 'none' }}
                          >
                            Deny
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Box>
          )}

          {/* Processed Requests */}
          {processedRequests.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Recent Activity ({processedRequests.length})
              </Typography>
              <List sx={{ p: 0 }}>
                {processedRequests.map((request) => (
                  <Card key={request.userSub} sx={{ mb: 1, boxShadow: 0, border: 1, borderColor: 'divider' }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.grey[500], 0.1) }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {request.userName}
                            </Typography>
                            <Chip
                              label={request.status}
                              color={getStatusColor(request.status) as any}
                              size="small"
                              icon={getStatusIcon(request.status)}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {request.userEmail}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(request.requestedAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default JoinRequestsPanel;

