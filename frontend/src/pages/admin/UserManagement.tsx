import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Tooltip,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import { api } from '../../contexts/AuthContext';

interface User {
  _id: string;
  username: string;
  email: string;
  is_verified: boolean;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
  verification_sent_at?: string;
  approved_at?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [allUsersResponse, pendingUsersResponse] = await Promise.all([
        api.get('/users/'),
        api.get('/users/pending/')
      ]);

      setUsers(allUsersResponse.data);
      setPendingUsers(pendingUsersResponse.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/approve`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      setError(error.response?.data?.detail || 'Failed to approve user');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/reject`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      setError(error.response?.data?.detail || 'Failed to reject user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}/`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const renderUserTable = (userList: User[], showActions: boolean = true) => (
    <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', mb: 4, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)' }}>
      <TableContainer>
      <Table>
          <TableHead sx={{ background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)' }}>
          <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>User</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Role</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 700 }}>Created</TableCell>
              {showActions && <TableCell sx={{ color: 'white', fontWeight: 700 }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {userList.map((user) => (
              <TableRow
                key={user._id}
                hover
                sx={{
                  transition: 'background 0.2s',
                  '&:hover': { background: 'rgba(99,102,241,0.07)' },
                }}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: '#6366f1', color: 'white', fontWeight: 700 }}>
                      {user.username ? user.username.charAt(0).toUpperCase() : <PersonIcon />}
                    </Avatar>
                    <Typography fontWeight={600}>{user.username}</Typography>
                  </Stack>
                </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                  {user.is_admin ? (
                    <Chip label="Admin" color="secondary" variant="filled" size="small" />
                  ) : user.is_approved ? (
                    <Chip label="Approved" color="success" variant="filled" size="small" />
                  ) : (
                    <Chip label="Pending" color="warning" variant="filled" size="small" />
                  )}
                  {user.is_verified && (
                    <Chip label="Verified" color="primary" variant="outlined" size="small" sx={{ ml: 1 }} />
                  )}
              </TableCell>
              <TableCell>
                  {user.is_admin ? (
                    <Chip label="Admin" color="secondary" size="small" />
                  ) : (
                    <Chip label="User" color="primary" size="small" />
                  )}
              </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
              {showActions && (
                <TableCell>
                    <Stack direction="row" spacing={1}>
                      {!user.is_admin && !user.is_approved && (
                        <Tooltip title="Approve User">
                          <IconButton color="success" onClick={() => handleApprove(user._id)}>
                          <CheckCircleIcon />
                        </IconButton>
                        </Tooltip>
                      )}
                      {!user.is_admin && user.is_approved && (
                        <Tooltip title="Reject User">
                          <IconButton color="warning" onClick={() => handleReject(user._id)}>
                          <CancelIcon />
                        </IconButton>
                        </Tooltip>
                      )}
                      {!user.is_admin && (
                        <Tooltip title="Delete User">
                          <IconButton color="error" onClick={() => handleDelete(user._id)}>
                        <DeleteIcon />
                      </IconButton>
                        </Tooltip>
                  )}
                    </Stack>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <IconButton color="primary" onClick={fetchUsers} title="Refresh User List">
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Remove all tab logic. Only show the user management table. */}
        <Box>
          <Typography variant="h6" gutterBottom>
            All Users
          </Typography>
          {users.length === 0 ? (
            <Alert severity="info">No users found.</Alert>
          ) : (
            renderUserTable(users)
          )}
        </Box>

      <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Users Pending Approval
          </Typography>
          {pendingUsers.length === 0 ? (
            <Alert severity="info">No users pending approval.</Alert>
          ) : (
            renderUserTable(pendingUsers)
          )}
        </Box>
    </Box>
  );
};

export default UserManagement; 