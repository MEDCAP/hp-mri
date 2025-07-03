import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Link, Alert } from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import { signUpCognito } from './cognitoUtils';
import HeaderAccount from '../../components/HeaderAccount';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // TODO: Add loading state and Cognito logic

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signUpCognito(name, email, password);
      navigate('/confirm-signup', { state: { email } });
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
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
              Create Account
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Sign up to get started with MEDCAP.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }} onSubmit={handleSignUp}>
              <TextField
                fullWidth
                label="Name"
                type="text"
                margin="normal"
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
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
                Sign Up
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 3 }}>
              Already have an account?{' '}
              <Link component={RouterLink} to="/account" underline="hover" color="secondary">
                Sign in
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default SignUpPage; 