import React from 'react';
import { Box, Button, AppBar, Toolbar } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isUsers = location.pathname === '/admin/users';
  const isDashboards = location.pathname.startsWith('/admin/dashboards');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
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
        <Toolbar sx={{ justifyContent: 'center', gap: 4 }}>
          <Button
            startIcon={<GroupIcon />}
            variant={isUsers ? 'contained' : 'outlined'}
            color={isUsers ? 'primary' : 'inherit'}
            size="large"
            sx={{
              fontWeight: 700,
              borderRadius: 3,
              px: 4,
              boxShadow: isUsers ? '0 2px 8px rgba(25, 118, 210, 0.10)' : 'none',
              background: isUsers ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)' : 'none',
              color: isUsers ? 'white' : 'primary.main',
              '&:hover': {
                background: isUsers
                  ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)'
                  : 'rgba(99,102,241,0.08)',
              },
              fontSize: '1.1rem',
            }}
            onClick={() => navigate('/admin/users')}
          >
            Manage Users
          </Button>
          <Button
            startIcon={<DashboardIcon />}
            variant={isDashboards ? 'contained' : 'outlined'}
            color={isDashboards ? 'primary' : 'inherit'}
            size="large"
            sx={{
              fontWeight: 700,
              borderRadius: 3,
              px: 4,
              boxShadow: isDashboards ? '0 2px 8px rgba(25, 118, 210, 0.10)' : 'none',
              background: isDashboards ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)' : 'none',
              color: isDashboards ? 'white' : 'primary.main',
              '&:hover': {
                background: isDashboards
                  ? 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)'
                  : 'rgba(99,102,241,0.08)',
              },
              fontSize: '1.1rem',
            }}
            onClick={() => navigate('/admin/dashboards')}
          >
            Manage Dashboards
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 6, p: 3 }}>{children}</Box>
    </Box>
  );
};

export default AdminLayout; 