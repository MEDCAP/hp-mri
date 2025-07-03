import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Link, Alert } from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import { signInCognito } from './cognitoUtils';
import HeaderAccount from '../../components/HeaderAccount';

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // TODO: Add loading state and Cognito logic

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInCognito(email, password);
      navigate('/mrd-files');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <>
      <HeaderAccount />
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#f8f9fa',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth={false} sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Paper
            elevation={4}
            sx={{
              padding: 5,
              borderRadius: 4,
              textAlign: 'center',
              width: 520,
              maxWidth: '95vw',
              boxShadow: 6,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box
                component="img"
                src={PigiLogo}
                alt="PIGI Lab Logo"
                sx={{ width: 120, height: 'auto', mb: 1, borderRadius: 2, boxShadow: 2 }}
              />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
              Sign In
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Welcome back! Please sign in to your account.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }} onSubmit={handleSignIn}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Button
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 2, py: 1.5, fontWeight: 600, fontSize: '1.1rem' }}
                type="submit"
              >
                Sign In
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              New to MEDCAP?{' '}
              <Link
                component={RouterLink}
                to="/signup"
                sx={{ fontWeight: 700, fontSize: '1.15rem', ml: 0.5, color: '#1976d2' }}
                underline="hover"
              >
                Create an account
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default AccountPage;
