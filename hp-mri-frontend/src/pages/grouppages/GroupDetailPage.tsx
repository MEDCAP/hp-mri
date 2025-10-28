import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  AdminPanelSettings,
  PersonAdd,
  PersonRemove,
  Star,
  StarBorder,
  ExitToApp
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { Group as GroupType, GroupMember } from '../../types/group';
import JoinRequestsPanel from '../../components/JoinRequestsPanel';
import ManageInviteCodesDialog from '../../components/ManageInviteCodesDialog';
import { getCurrentUserSub } from '../loginpages/cognitoUtils';

const GroupDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { groupName } = useParams<{ groupName: string }>();
  const [group, setGroup] = useState<GroupType | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCodesDialogOpen, setInviteCodesDialogOpen] = useState(false);
  const [userSubToInvite, setUserSubToInvite] = useState('');
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserMember, setIsUserMember] = useState(false);

  useEffect(() => {
    if (groupName) {
      fetchGroupDetails();
    }
  }, [groupName]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const [groupResponse, membersResponse] = await Promise.all([
        apiClient.get(`/groups/${groupName}`),
        apiClient.get(`/groups/${groupName}/members`)
      ]);
      
      setGroup(groupResponse.data);
      setMembers(membersResponse.data.members);
      
      // Check if current user is admin or member
      const currentUserSub = getCurrentUserSubLocal();
      console.log('DEBUG: Current user sub:', currentUserSub);
      console.log('DEBUG: Group admins:', groupResponse.data.admins);
      console.log('DEBUG: Group members:', groupResponse.data.members);
      console.log('DEBUG: Is user admin?', groupResponse.data.admins.includes(currentUserSub));
      console.log('DEBUG: Is user member?', groupResponse.data.members.includes(currentUserSub));
      
      setIsUserAdmin(groupResponse.data.admins.includes(currentUserSub));
      setIsUserMember(groupResponse.data.members.includes(currentUserSub));
      
      setError(null);
    } catch (error: any) {
      console.error('Error fetching group details:', error);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserSubLocal = () => {
    return getCurrentUserSub() || 'unknown-user-sub';
  };

  const handleUpdateGroup = async (updates: { displayName?: string; description?: string }) => {
    try {
      await apiClient.patch(`/groups/${groupName}`, updates);
      fetchGroupDetails();
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating group:', error);
      alert(error.response?.data?.error || 'Failed to update group');
    }
  };

  const handleInviteMember = async () => {
    if (!userSubToInvite.trim()) return;

    try {
      await apiClient.post(`/groups/${groupName}/members`, {
        userSub: userSubToInvite.trim()
      });
      setUserSubToInvite('');
      setInviteDialogOpen(false);
      fetchGroupDetails();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      alert(error.response?.data?.error || 'Failed to invite member');
    }
  };

  const handleRemoveMember = async (userSub: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupName}/members/${userSub}`);
      fetchGroupDetails();
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handlePromoteToAdmin = async (userSub: string) => {
    try {
      await apiClient.post(`/groups/${groupName}/admins`, {
        userSub
      });
      fetchGroupDetails();
    } catch (error: any) {
      console.error('Error promoting member:', error);
      alert(error.response?.data?.error || 'Failed to promote member');
    }
  };

  const handleDemoteAdmin = async (userSub: string) => {
    if (!window.confirm('Are you sure you want to demote this admin?')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupName}/admins/${userSub}`);
      fetchGroupDetails();
    } catch (error: any) {
      console.error('Error demoting admin:', error);
      alert(error.response?.data?.error || 'Failed to demote admin');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupName}/members/${getCurrentUserSubLocal()}`);
      navigate('/groups');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      alert(error.response?.data?.error || 'Failed to leave group');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading group details...</Typography>
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/groups')} sx={{ mt: 2 }}>
          Back to Groups
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/groups')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          {group.displayName}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6">Group Information</Typography>
                {isUserAdmin && (
                  <Button
                    startIcon={<Edit />}
                    onClick={() => setEditDialogOpen(true)}
                    size="small"
                  >
                    Edit
                  </Button>
                )}
              </Box>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                {group.description || 'No description provided'}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={`${group.members.length} members`} size="small" />
                <Chip label={`${group.admins.length} admins`} size="small" color="primary" />
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                Created {new Date(group.createdAt).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Actions</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {isUserMember && (
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => setInviteDialogOpen(true)}
                    fullWidth
                  >
                    Invite Member
                  </Button>
                )}
                
                {isUserAdmin && (
                  <Button
                    variant="outlined"
                    startIcon={<PersonAdd />}
                    onClick={() => setInviteCodesDialogOpen(true)}
                    fullWidth
                    sx={{ textTransform: 'none' }}
                  >
                    Manage Invite Codes
                  </Button>
                )}
                
                {isUserMember && !isUserAdmin && (
                  <Button
                    variant="outlined"
                    startIcon={<ExitToApp />}
                    onClick={handleLeaveGroup}
                    fullWidth
                    color="error"
                  >
                    Leave Group
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Members ({members.length})
              </Typography>
              
              <List>
                {members.map((member, index) => (
                  <React.Fragment key={member.sub}>
                    <ListItem>
                      <ListItemText
                        primary={member.sub}
                        secondary={member.isAdmin ? 'Admin' : 'Member'}
                      />
                      <ListItemSecondaryAction>
                        {isUserAdmin && member.sub !== getCurrentUserSubLocal() && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {member.isAdmin ? (
                              <Tooltip title="Demote to Member">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDemoteAdmin(member.sub)}
                                >
                                  <Star />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Promote to Admin">
                                <IconButton
                                  size="small"
                                  onClick={() => handlePromoteToAdmin(member.sub)}
                                >
                                  <StarBorder />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Remove Member">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMember(member.sub)}
                              >
                                <PersonRemove />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < members.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Join Requests Panel - Only for Admins */}
        {isUserAdmin && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <JoinRequestsPanel groupName={groupName!} isAdmin={isUserAdmin} />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Display Name"
            fullWidth
            variant="outlined"
            defaultValue={group.displayName}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            defaultValue={group.description}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // This would need to be implemented to get the form values
              handleUpdateGroup({});
            }}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="User Sub (Cognito ID)"
            fullWidth
            variant="outlined"
            value={userSubToInvite}
            onChange={(e) => setUserSubToInvite(e.target.value)}
            helperText="Enter the Cognito sub (user ID) of the person to invite"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleInviteMember}
            variant="contained"
            disabled={!userSubToInvite.trim()}
          >
            Invite
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Manage Invite Codes Dialog */}
      <ManageInviteCodesDialog
        open={inviteCodesDialogOpen}
        onClose={() => setInviteCodesDialogOpen(false)}
        groupName={groupName!}
      />
    </Box>
  );
};

export default GroupDetailPage;

