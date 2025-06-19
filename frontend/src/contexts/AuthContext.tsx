import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { User } from '../types'
import { Box, CircularProgress } from '@mui/material'
import { API_BASE_URL } from '../config/api'

// Configure axios defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me')
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      // Create URLSearchParams for form data
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const response = await api.post('/login/access-token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      const { access_token } = response.data
      localStorage.setItem('token', access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      // Fetch user data and return it
      const userResponse = await api.get('/users/me')
      const userData = userResponse.data
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      await api.post('/register', {
        username,
        email,
        password,
      })
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export the configured axios instance
export { api } 