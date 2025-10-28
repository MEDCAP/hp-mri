import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';

interface JoinRequestStatus {
  groupName: string;
  displayName: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
}

interface JoinRequestStatusProps {
  userSub: string;
}

const JoinRequestStatus: React.FC<JoinRequestStatusProps> = ({ userSub }) => {
  const theme = useTheme();
  const [requests, setRequests] = useState<JoinRequestStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJoinRequestStatus();
  }, [userSub]);

  const loadJoinRequestStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/groups/my-join-requests');
      setRequests(response.data.joinRequests);
      
    } catch (error: any) {
      console.error('Error loading join request status:', error);
      setError('Failed to load join request status');
    } finally {
      setLoading(false);
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
      case 'pending': return <AccessTimeIcon />;
      case 'approved': return <CheckCircleIcon />;
      case 'denied': return <CancelIcon />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for approval';
      case 'approved': return 'Request approved';
      case 'denied': return 'Request denied';
      default: return 'Unknown status';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (requests.length === 0) {
    return (
      <Card variant="outlined" sx={{ textAlign: 'center', py: 3 }}>
        <CardContent>
          <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No pending join requests
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Your join requests will appear here
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          My Join Requests
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {requests.filter(r => r.status === 'pending').length} pending
          </Typography>
          <RefreshIcon 
            fontSize="small" 
            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={loadJoinRequestStatus}
          />
        </Box>
      </Box>

      <List sx={{ p: 0 }}>
        {requests.map((request, index) => (
          <Card key={index} sx={{ mb: 1, boxShadow: 1 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GroupIcon color="primary" />
                </Box>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {request.displayName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={getStatusText(request.status)}
                      color={getStatusColor(request.status) as any}
                      size="small"
                      icon={getStatusIcon(request.status)}
                      sx={{ textTransform: 'none' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Requested {formatDate(request.requestedAt)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>
    </Box>
  );
};

export default JoinRequestStatus;
