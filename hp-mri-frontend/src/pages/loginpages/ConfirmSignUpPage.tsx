import React, { useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Link, Alert } from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import { confirmSignUpCognito } from './cognitoUtils';

const ConfirmSignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Get email from navigation state or query param
  const email = (location.state && (location.state as any).email) || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  // TODO: Add loading state and Cognito logic

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await confirmSignUpCognito(email, code);
      navigate('/account');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    }
  };

  return (
    <Container
      maxWidth="xs"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #e3f2fd 0%, #f8f9fa 100%)',
      }}
    >
      <Paper
        elevation={4}
        sx={{
          padding: 5,
          borderRadius: 4,
          textAlign: 'center',
          width: '100%',
          maxWidth: 400,
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
          Confirm Your Email
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Enter the code sent to your email address to complete registration.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }} onSubmit={handleConfirm}>
          <TextField
            fullWidth
            label="Confirmation Code"
            type="text"
            margin="normal"
            required
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2, py: 1.5, fontWeight: 600, fontSize: '1.1rem' }}
            type="submit"
          >
            Confirm
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 3 }}>
          Already confirmed?{' '}
          <Link component={RouterLink} to="/account" underline="hover" color="secondary">
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default ConfirmSignUpPage; 