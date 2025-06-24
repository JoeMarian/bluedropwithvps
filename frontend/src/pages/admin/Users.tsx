import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import axios from 'axios'

interface User {
  _id: string
  username: string
  email: string
  is_verified: boolean
  is_approved: boolean
  is_admin: boolean
}

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/v1/users/')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await axios.put(`/api/v1/users/${userId}/approve`)
      fetchUsers()
    } catch (error) {
      console.error('Error approving user:', error)
    }
  }

  const handleDisapprove = async (userId: string) => {
    try {
      await axios.put(`/api/v1/users/${userId}/disapprove`)
      fetchUsers()
    } catch (error) {
      console.error('Error disapproving user:', error)
    }
  }

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/v1/users/${userId}`)
        fetchUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Manage Users
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Verified</TableCell>
              <TableCell>Approved</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.is_verified ? 'Yes' : 'No'}
                </TableCell>
                <TableCell>
                  {user.is_approved ? 'Yes' : 'No'}
                </TableCell>
                <TableCell>
                  {user.is_admin ? 'Yes' : 'No'}
                </TableCell>
                <TableCell>
                  {!user.is_admin && (
                    <>
                      {user.is_verified && !user.is_approved && (
                        <Tooltip title="Approve">
                          <IconButton
                            color="success"
                            onClick={() => handleApprove(user._id)}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {user.is_approved && (
                        <Tooltip title="Disapprove">
                          <IconButton
                            color="error"
                            onClick={() => handleDisapprove(user._id)}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(user._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  )
}

export default AdminUsers 