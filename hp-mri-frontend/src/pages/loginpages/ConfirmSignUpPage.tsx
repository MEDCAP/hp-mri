import React, { useState } from 'react';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Link, Alert, Snackbar } from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import HeaderAccount from '../../components/HeaderAccount';
import { confirmSignUpCognito } from './cognitoUtils';

const ConfirmSignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Get email from navigation state or query param
  const email = (location.state && (location.state as any).email) || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await confirmSignUpCognito(email, code);
      setSnackbar({ open: true, message: 'Email confirmed! Please sign in.', severity: 'success' });
      setTimeout(() => navigate('/account', { state: { email } }), 1200);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
      setSnackbar({ open: true, message: err.message || 'Invalid or expired code', severity: 'error' });
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
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              Already confirmed?{' '}
              <Link component={RouterLink} to="/account" underline="hover" color="secondary" sx={{ fontWeight: 700, fontSize: '1.15rem', ml: 0.5, color: '#1976d2' }}>
                Sign in
              </Link>
            </Typography>
          </Paper>
        </Container>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          message={snackbar.message}
          ContentProps={{ sx: { backgroundColor: snackbar.severity === 'success' ? 'success.main' : 'error.main', color: '#fff', fontWeight: 600 } }}
        />
      </Box>
    </>
  );
};

export default ConfirmSignUpPage; 