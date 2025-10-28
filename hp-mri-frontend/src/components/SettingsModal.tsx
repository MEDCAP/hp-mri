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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Card,
  CardContent,
  Tabs,
  Tab,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import apiClient from '../api/apiClient';
import { getCurrentUserName, getCurrentUserEmail, getCurrentUserSub } from '../pages/loginpages/cognitoUtils';
import { useNavigate } from 'react-router-dom';
import { Group } from '../types/group';
import CreateGroupDialog from './CreateGroupDialog';
import JoinGroupDialog from './JoinGroupDialog';
import JoinRequestStatus from './JoinRequestStatus';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open) {
      loadUserData();
      loadGroups();
    }
  }, [open]);

  const loadUserData = () => {
    const name = getCurrentUserName();
    const email = getCurrentUserEmail();
    setUserName(name || '');
    setUserEmail(email || '');
  };

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setCreateGroupOpen(true);
  };

  const handleJoinGroup = () => {
    setJoinGroupOpen(true);
  };

  const handleGroupCreated = () => {
    // Refresh the groups list
    loadGroups();
  };

  const handleGroupJoined = () => {
    // Refresh the groups list
    loadGroups();
  };

  const handleGroupClick = (groupName: string) => {
    navigate(`/groups/${groupName}`);
    onClose(); // Close the settings modal
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh'
        }
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
          <SettingsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {/* User Profile Section */}
        <Card sx={{ mb: 3, boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Profile Information
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Name"
                value={userName}
                disabled
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <TextField
                label="Email"
                value={userEmail}
                disabled
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Profile information is managed through your AWS Cognito account.
            </Typography>
          </CardContent>
        </Card>

        {/* Groups Section */}
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Group Management
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleCreateGroup}
                  sx={{ textTransform: 'none' }}
                >
                  Create Group
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleJoinGroup}
                  sx={{ textTransform: 'none' }}
                >
                  Join Group
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Loading groups...
              </Typography>
            ) : groups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You're not a member of any groups yet.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleCreateGroup}
                  sx={{ textTransform: 'none' }}
                >
                  Create Your First Group
                </Button>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {groups.map((group, index) => (
                  <React.Fragment key={group._id}>
                    <ListItem
                      button
                      onClick={() => handleGroupClick(group.name)}
                      sx={{
                        px: 0,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04)
                        },
                        cursor: 'pointer',
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          width: 32,
                          height: 32,
                          mr: 2
                        }}
                      >
                        <GroupIcon fontSize="small" />
                      </Avatar>
                      
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {group.displayName}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {group.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={`${group.members.length} members`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem', height: 20 }}
                              />
                              {group.admins.includes('current-user-sub') && (
                                <Chip
                                  label="Admin"
                                  size="small"
                                  color="primary"
                                  sx={{ fontSize: '0.75rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <IconButton size="small" edge="end">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < groups.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Join Request Status Section */}
        <Card sx={{ mt: 3, boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <GroupIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                My Join Requests
              </Typography>
            </Box>
            <JoinRequestStatus userSub={getCurrentUserSub() || 'unknown-user-sub'} />
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
      
      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
      
      {/* Join Group Dialog */}
      <JoinGroupDialog
        open={joinGroupOpen}
        onClose={() => setJoinGroupOpen(false)}
        onGroupJoined={handleGroupJoined}
      />
    </Dialog>
  );
};

export default SettingsModal;
