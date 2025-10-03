import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Paper, Link, Alert, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import { signUpCognito } from './cognitoUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { green, orange } from '@mui/material/colors';

const passwordRequirements = [
  {
    label: 'At least 8 characters',
    test: (pw: string) => pw.length >= 8,
  },
  {
    label: 'Contains at least 1 number',
    test: (pw: string) => /[0-9]/.test(pw),
  },
  {
    label: 'Contains at least 1 special character',
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
  {
    label: 'Contains at least 1 uppercase letter',
    test: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    label: 'Contains at least 1 lowercase letter',
    test: (pw: string) => /[a-z]/.test(pw),
  },
];

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
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
                onFocus={() => { setPasswordFocused(true); setConfirmFocused(false); }}
                onBlur={() => setPasswordFocused(false)}
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                margin="normal"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onFocus={() => { setConfirmFocused(true); setPasswordFocused(false); }}
                onBlur={() => setConfirmFocused(false)}
              />
              {/* Password validation list */}
              {passwordFocused && !confirmFocused && (
                <List dense sx={{ textAlign: 'left', mb: 1, mt: 0, p: 0 }}>
                  {passwordRequirements.map((req, idx) => {
                    const met = req.test(password);
                    return (
                      <ListItem key={idx} sx={{ py: 0.2, minHeight: 0 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          {met ? (
                            <CheckCircleIcon sx={{ color: green[600], fontSize: 18 }} />
                          ) : (
                            <WarningAmberIcon sx={{ color: orange[700], fontSize: 18 }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={req.label}
                          primaryTypographyProps={{
                            color: met ? 'success.main' : 'text.secondary',
                            fontWeight: met ? 600 : 400,
                            fontSize: '0.95rem',
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
              {/* Confirm password validation */}
              {confirmFocused && (
                <Box sx={{ textAlign: 'left', mb: 1, mt: 0, display: 'flex', alignItems: 'center', minHeight: 28 }}>
                  {passwordsMatch ? (
                    <>
                      <CheckCircleIcon sx={{ color: green[600], fontSize: 18, mr: 1 }} />
                      <Typography color="success.main" fontWeight={600} fontSize="0.95rem">Passwords match</Typography>
                    </>
                  ) : (
                    <>
                      <WarningAmberIcon sx={{ color: orange[700], fontSize: 18, mr: 1 }} />
                      <Typography color="text.secondary" fontWeight={400} fontSize="0.95rem">Passwords do not match</Typography>
                    </>
                  )}
                </Box>
              )}
              <Button
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 2, py: 1.5, fontWeight: 600, fontSize: '1.1rem' }}
                type="submit"
                disabled={
                  !passwordRequirements.every(req => req.test(password)) ||
                  !passwordsMatch
                }
              >
                Sign Up
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/account"
                sx={{ fontWeight: 700, fontSize: '1.15rem', ml: 0.5, color: '#1976d2' }}
                underline="hover"
              >
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