import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add,
  Group,
  AdminPanelSettings,
  People,
  Delete,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { Group as GroupType, CreateGroupRequest } from '../../types/group';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState<CreateGroupRequest>({
    name: '',
    displayName: '',
    description: ''
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/groups');
      setGroups(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim() || !newGroup.displayName.trim()) {
      setCreateError('Name and display name are required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      await apiClient.post('/groups', newGroup);
      setCreateDialogOpen(false);
      setNewGroup({ name: '', displayName: '', description: '' });
      fetchGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      setCreateError(error.response?.data?.error || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupName: string) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupName}`);
      fetchGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      alert(error.response?.data?.error || 'Failed to delete group');
    }
  };

  const isUserAdmin = (group: GroupType, userSub: string) => {
    return group.admins.includes(userSub);
  };

  const getCurrentUserSub = () => {
    // This would need to be implemented to get the current user's sub
    // For now, we'll assume it's available from the auth context
    return 'current-user-sub'; // This should be replaced with actual user sub
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading groups...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Group sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No groups yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first group to start collaborating with others
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {group.displayName}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {isUserAdmin(group, getCurrentUserSub()) && (
                        <Chip
                          icon={<AdminPanelSettings />}
                          label="Admin"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {group.description || 'No description'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Created {new Date(group.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => navigate(`/groups/${group.name}`)}
                  >
                    View
                  </Button>
                  
                  {isUserAdmin(group, getCurrentUserSub()) && (
                    <Box>
                      <Tooltip title="Delete Group">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteGroup(group.name)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            helperText="3-50 characters, alphanumeric, hyphens, underscores only"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Display Name"
            fullWidth
            variant="outlined"
            value={newGroup.displayName}
            onChange={(e) => setNewGroup({ ...newGroup, displayName: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPage;

