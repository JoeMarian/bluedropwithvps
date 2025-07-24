import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Divider
} from '@mui/material';
import {
  Dashboard,
  AdminPanelSettings,

  Logout,
  WaterDrop,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleDashboard = () => {
    if (user?.is_admin) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
    handleMenuClose();
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            <WaterDrop sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              BlueDrop
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.75rem'
              }}
            >
              by TeamSKRN
            </Typography>
          </Box>
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
          {!user?.is_admin && (
            <Button
              color="inherit"
              onClick={handleDashboard}
              startIcon={<Dashboard />}
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: 'primary.main'
                }
              }}
            >
              Dashboard
            </Button>
          )}

          {user?.is_admin && (
            <Button
              color="inherit"
              onClick={() => navigate('/admin')}
              startIcon={<AdminPanelSettings />}
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': {
                  background: 'rgba(220, 0, 78, 0.1)',
                  color: 'secondary.main'
                }
              }}
            >
              Admin Panel
            </Button>
          )}

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* User Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.is_admin ? 'Admin' : 'User'}
              size="small"
              color={user?.is_admin ? 'secondary' : 'primary'}
              variant="outlined"
            />
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                p: 0,
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s ease'
                }
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Box>

        {/* Mobile Menu Button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            color="inherit"
            onClick={handleMobileMenuOpen}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Desktop Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }
          }}
        >
          <MenuItem onClick={handleMenuClose} disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '0.875rem'
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
          <Divider />
          {!user?.is_admin && (
            <MenuItem onClick={handleDashboard}>
              <Dashboard sx={{ mr: 2, fontSize: 20 }} />
              Dashboard
            </MenuItem>
          )}
          {user?.is_admin && (
            <MenuItem onClick={() => { navigate('/admin'); handleMenuClose(); }}>
              <AdminPanelSettings sx={{ mr: 2, fontSize: 20 }} />
              Admin Panel
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <Logout sx={{ mr: 2, fontSize: 20 }} />
            Logout
          </MenuItem>
        </Menu>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 250,
              borderRadius: 2,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }
          }}
        >
          <MenuItem onClick={handleMenuClose} disabled>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.is_admin ? 'Admin' : 'User'}
                  size="small"
                  color={user?.is_admin ? 'secondary' : 'primary'}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
          </MenuItem>
          <Divider />
          {!user?.is_admin && (
            <MenuItem onClick={handleDashboard}>
              <Dashboard sx={{ mr: 2, fontSize: 20 }} />
              Dashboard
            </MenuItem>
          )}
          {user?.is_admin && (
            <MenuItem onClick={() => { navigate('/admin'); handleMenuClose(); }}>
              <AdminPanelSettings sx={{ mr: 2, fontSize: 20 }} />
              Admin Panel
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <Logout sx={{ mr: 2, fontSize: 20 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 