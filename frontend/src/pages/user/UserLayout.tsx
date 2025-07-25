import React from 'react';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';

const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)',
        pb: 6,
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e0e0e0',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Button
            startIcon={<DashboardIcon />}
            variant={isDashboard ? 'contained' : 'outlined'}
            color={isDashboard ? 'primary' : 'inherit'}
            size="large"
            sx={{
              fontWeight: 700,
              borderRadius: 3,
              px: 4,
              boxShadow: isDashboard ? '0 2px 8px rgba(25, 118, 210, 0.10)' : 'none',
              background: isDashboard ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)' : 'none',
              color: isDashboard ? 'white' : 'primary.main',
              '&:hover': {
                background: isDashboard
                  ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)'
                  : 'rgba(99,102,241,0.08)',
              },
              fontSize: '1.1rem',
            }}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
          
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 6, p: 3 }}>{children}</Box>
    </Box>
  );
};

export default UserLayout; 