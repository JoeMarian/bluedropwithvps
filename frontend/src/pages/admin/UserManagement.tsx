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
  Tabs,
  Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../../contexts/AuthContext';
import { formatIST } from '../../utils/date';

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
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [allUsersResponse, pendingUsersResponse] = await Promise.all([
        api.get('/users'),
        api.get('/users/pending')
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
      await api.delete(`/users/${userId}`);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderUserTable = (userList: User[], showActions: boolean = true) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Username</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Created</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {userList.map((user) => (
            <TableRow key={user._id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={user.is_verified ? 'Verified' : 'Not Verified'}
                    color={user.is_verified ? 'success' : 'warning'}
                    size="small"
                  />
                  <Chip
                    label={user.is_approved ? 'Approved' : 'Not Approved'}
                    color={user.is_approved ? 'success' : 'warning'}
                    size="small"
                  />
                  {user.is_admin && (
                    <Chip label="Admin" color="primary" size="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {formatIST(user.created_at, { dateStyle: 'medium' })}
              </TableCell>
              {showActions && (
                <TableCell>
                  {!user.is_admin && (
                    <>
                      {!user.is_approved && user.is_verified && (
                        <IconButton
                          color="success"
                          onClick={() => handleApprove(user._id)}
                          title="Approve User"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      )}
                      {user.is_approved && (
                        <IconButton
                          color="warning"
                          onClick={() => handleReject(user._id)}
                          title="Reject User"
                        >
                          <CancelIcon />
                        </IconButton>
                      )}
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(user._id)}
                        title="Delete User"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`All Users (${users.length})`} />
          <Tab label={`Pending Approval (${pendingUsers.length})`} />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
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
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Users Pending Approval
          </Typography>
          {pendingUsers.length === 0 ? (
            <Alert severity="info">No users pending approval.</Alert>
          ) : (
            renderUserTable(pendingUsers)
          )}
        </Box>
      )}
    </Box>
  );
};

export default UserManagement; 