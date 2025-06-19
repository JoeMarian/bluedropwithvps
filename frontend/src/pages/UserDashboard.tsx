import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  Chip,
  CardActions,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { api } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import DashboardViewer from './admin/DashboardViewer';

interface DashboardField {
  name: string;
  type: string;
  unit?: string;
  value?: number;
}

interface Widget {
  id: string;
  type: string;
  title: string;
  field: string;
  chartType?: string;
  timeRange?: string;
  aggregationInterval?: string;
  unit?: string;
  axisLabels?: {
    x: string;
    y: string;
  };
}

interface Dashboard {
  _id: string;
  name: string;
  description: string;
  created_by: string;
  api_key: string;
  is_public: boolean;
  fields: DashboardField[];
  widgets: Widget[];
  assigned_users: string[];
  created_at: string;
  updated_at: string;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingDashboard, setViewingDashboard] = useState<Dashboard | null>(null);

  const fetchDashboards = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user dashboards...'); // Debug log
      setLoading(true);
      const response = await api.get('/dashboards/my-dashboards');
      console.log('User dashboards response:', response.data); // Debug log
      setDashboards(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching user dashboards:', err); // Debug log
      if (err instanceof Error) {
        setError(`Failed to fetch dashboards: ${err.message}`);
      } else {
        setError('Failed to fetch dashboards. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('UserDashboard mounted, user:', user); // Debug log
    fetchDashboards();
  }, [user]);

  const handleViewDashboard = (dashboard: Dashboard) => {
    setViewingDashboard(dashboard);
  };

  const handleCloseViewer = () => {
    setViewingDashboard(null);
  };

  if (!user) {
    return (
      <Box p={3}>
        <Alert severity="error">Please log in to view your dashboards.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (dashboards.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">No dashboards available. Please contact an administrator to create one for you.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        My Dashboards
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome, {user.username}! Here are the dashboards assigned to you.
      </Typography>
      
      <Grid container spacing={3}>
        {dashboards.map((dashboard) => (
          <Grid item xs={12} sm={6} md={4} key={dashboard._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {dashboard.name}
                  </Typography>
                  {dashboard.is_public && (
                    <Chip label="Public" size="small" color="success" />
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {dashboard.description || 'No description available'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`${dashboard.fields.length} Fields`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`${dashboard.widgets.length} Widgets`} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(dashboard.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewDashboard(dashboard)}
                  variant="contained"
                  fullWidth
                >
                  View Dashboard
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dashboard Viewer */}
      {viewingDashboard && (
        <DashboardViewer 
          dashboard={viewingDashboard} 
          onClose={handleCloseViewer} 
        />
      )}
    </Box>
  );
};

export default UserDashboard; 