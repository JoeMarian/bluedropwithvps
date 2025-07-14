import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Container } from '@mui/material';
import { WaterDrop } from '@mui/icons-material'; // Add WaterDrop for consistency with other pages

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!token) {
      setError('Invalid or missing reset link. Please try the "Forgot Password" process again.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('New password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm_password: confirmPassword })
      });
      const data = await res.json(); // Always parse JSON to get error details

      if (res.ok) {
        setSuccess('Password reset successful! You will be redirected to the login page shortly.');
        setTimeout(() => navigate('/login'), 3000); // Redirect after 3 seconds
      } else {
        // Use the detail message from the backend if available, otherwise a generic one
        if (data.detail === 'Token expired.') {
          setError('The password reset link has expired. Please request a new one.');
        } else {
          setError(data.detail || 'Password reset failed. Please try again.');
        }
        console.error("Password reset API error:", data); // Log the full error response for debugging
      }
    } catch (err) {
      console.error("Password reset fetch error:", err); // Log network or parsing errors
      setError('Failed to connect to the server. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column', // Use column for logo + card layout
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
        position: 'relative', // For decorative elements
        overflow: 'hidden'
      }}
    >
      {/* Background decorative elements - Copied from Login/Register for consistency */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          animation: 'pulse 3s infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          animation: 'pulse 4s infinite 1s'
        }}
      />

      {/* Logo and Brand - Copied from Login/Register for consistency */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 4, // Add margin bottom to separate from card
          mt: -8 // Adjust margin top to pull up slightly if needed
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <WaterDrop sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            TankManage {/* Changed from BlueDrop to TankManage as per Login.tsx */}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 500
            }}
          >
            by TeamSKRN
          </Typography>
        </Box>
      </Box>

      <Container maxWidth="sm">
        <Card sx={{ background: 'rgba(255,255,255,0.97)', borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>Set New Password</Typography>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                sx={{ mb: 3 }}
                required
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                sx={{ mb: 3 }}
                required
                variant="outlined"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                sx={{ py: 1.5, fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button variant="text" onClick={() => navigate('/login')} disabled={loading}>
                Back to Login
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Footer - Copied from Login/Register for consistency */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem'
            }}
          >
          TankManage by TeamSKRN.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ResetPassword;