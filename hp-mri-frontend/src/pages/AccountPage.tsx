import { useEffect } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper } from '@mui/material';

const AccountPage: React.FC = () => {
  useEffect(() => {
    document.title = "HP-MRI Web App"; // Dynamically updates the tab title
  }, []);

  const navigate = useNavigate();

  const handleSignIn = () => {
    // TODO - Logic for signing in
    // For the meantime navigate to tools
    navigate(`/mrd-files`);
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          borderRadius: 2,
          textAlign: 'center',
          width: '100%',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Account
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Sign in to your account
        </Typography>
        <Box component="form" noValidate autoComplete="off" sx={{ marginTop: 3 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            margin="normal"
            required
          />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{ marginTop: 2, padding: '10px' }}
            onClick={handleSignIn}
          >
            Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AccountPage;
