import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { api } from '../contexts/AuthContext';

const EmailVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || hasVerified) {
        return;
      }

      try {
        setHasVerified(true);
        const response = await api.post(`/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (error: any) {
        // Check if the error is because token was already used
        if (error.response?.data?.detail === 'Invalid verification token') {
          setStatus('success');
          setMessage('Email already verified successfully! You can now log in.');
        } else {
          setStatus('error');
          setMessage(error.response?.data?.detail || 'Verification failed. Please try again.');
        }
      }
    };

    verifyEmail();
  }, [token, hasVerified]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToRegister = () => {
    navigate('/register');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Verifying Email...
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please wait while we verify your email address.
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                Email Verified Successfully!
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your email has been verified. Please wait for admin approval before you can log in.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGoToLogin}
                sx={{ mr: 2 }}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="error.main">
                Verification Failed
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                The verification link may be invalid or expired. Please try registering again.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGoToRegister}
                sx={{ mr: 2 }}
              >
                Register Again
              </Button>
              <Button
                variant="outlined"
                onClick={handleGoToLogin}
              >
                Go to Login
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerification; 