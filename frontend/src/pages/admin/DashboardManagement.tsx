import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Visibility as ViewIcon,
  Info as DetailsIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { api } from '../../contexts/AuthContext';
import DashboardViewer from './DashboardViewer';
import { formatIST } from '../../utils/date';

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

interface User {
  _id: string;
  username: string;
  email: string;
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

const DashboardManagement: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [detailsDashboard, setDetailsDashboard] = useState<Dashboard | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [viewingDashboard, setViewingDashboard] = useState<Dashboard | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
    fields: [{ name: '', type: 'number', unit: '', value: undefined }] as any[],
    widgets: [] as Widget[],
    assigned_users: [] as string[]
  });

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboards');
      console.log('Dashboards response:', response.data);
      setDashboards(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboards:', err);
      setError('Failed to fetch dashboards');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchUsers();
  }, []);

  const handleCreateDashboard = async () => {
    try {
      // Filter out empty fields
      const validFields = formData.fields.filter(field => field.name.trim() !== '');
      
      const dashboardData = {
        ...formData,
        fields: validFields
      };
      
      await api.post('/dashboards', dashboardData);
      setOpenDialog(false);
      resetForm();
      fetchDashboards();
    } catch (err) {
      console.error('Error creating dashboard:', err);
      setError('Failed to create dashboard');
    }
  };

  const handleUpdateDashboard = async () => {
    if (!editingDashboard) return;
    
    try {
      const validFields = formData.fields.filter(field => field.name.trim() !== '');
      
      const dashboardData = {
        ...formData,
        fields: validFields
      };
      
      await api.put(`/dashboards/${editingDashboard._id}`, dashboardData);
      setOpenDialog(false);
      setEditingDashboard(null);
      resetForm();
      fetchDashboards();
    } catch (err) {
      console.error('Error updating dashboard:', err);
      setError('Failed to update dashboard');
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!dashboardId) {
      console.error('Dashboard ID is undefined or null');
      setError('Invalid dashboard ID');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log('Attempting to delete dashboard with ID:', dashboardId);
      const response = await api.delete(`/dashboards/${dashboardId}`);
      console.log('Delete response:', response.data);
      fetchDashboards();
    } catch (err: any) {
      console.error('Error deleting dashboard:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(`Failed to delete dashboard: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEdit = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setFormData({
      name: dashboard.name,
      description: dashboard.description,
      is_public: dashboard.is_public,
      fields: dashboard.fields.length > 0 ? dashboard.fields : [{ name: '', type: 'number', unit: '', value: undefined }],
      widgets: dashboard.widgets,
      assigned_users: dashboard.assigned_users
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDashboard(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_public: false,
      fields: [{ name: '', type: 'number', unit: '', value: undefined }],
      widgets: [],
      assigned_users: []
    });
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', type: 'number', unit: '', value: undefined }]
    }));
  };

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const updateField = (index: number, field: Partial<DashboardField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...field } : f)
    }));
  };

  const addWidget = () => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: 'chart',
      title: '',
      field: '',
      chartType: 'line',
      timeRange: '24h',
      aggregationInterval: '1h'
    };
    
    setFormData(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  };

  const removeWidget = (widgetId: string) => {
    setFormData(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }));
  };

  const updateWidget = (widgetId: string, updates: Partial<Widget>) => {
    setFormData(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w)
    }));
  };

  const toggleUserAssignment = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_users: prev.assigned_users.includes(userId)
        ? prev.assigned_users.filter(id => id !== userId)
        : [...prev.assigned_users, userId]
    }));
  };

  const handleViewDetails = (dashboard: Dashboard) => {
    setDetailsDashboard(dashboard);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setDetailsDashboard(null);
  };

  const handleViewDashboard = (dashboard: Dashboard) => {
    setViewingDashboard(dashboard);
  };

  const handleCloseViewer = () => {
    setViewingDashboard(null);
  };

  if (loading) {
    return <Typography>Loading dashboards...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard Management</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenDialog(true)}
        >
          Create Dashboard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {dashboards.length === 0 ? (
        <Typography variant="h6" color="text.secondary">
          No dashboards found.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {dashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {dashboard.name}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(dashboard)}
                        title="Edit Dashboard"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        title="View Full Screen"
                        onClick={() => handleViewDashboard(dashboard)}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="info"
                        title="View Details"
                        onClick={() => handleViewDetails(dashboard)}
                      >
                        <DetailsIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDashboard(dashboard._id)}
                        title="Delete Dashboard"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {dashboard.description}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`${dashboard.fields.length} Fields`} size="small" />
                    <Chip label={`${dashboard.assigned_users.length} Users`} size="small" />
                    {dashboard.is_public && <Chip label="Public" size="small" color="primary" />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Created: {formatIST(dashboard.created_at)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingDashboard ? 'Edit Dashboard' : 'Create Dashboard'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Basic Information */}
            <TextField
              autoFocus
              label="Dashboard Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
              }
              label="Make this dashboard public"
            />

            <Divider />

            {/* Fields Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Fields ({formData.fields.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {formData.fields.map((field, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="Field Name"
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                      <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value })}
                          label="Type"
                        >
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Unit"
                        value={field.unit || ''}
                        onChange={(e) => updateField(index, { unit: e.target.value })}
                        sx={{ width: 100 }}
                      />
                      {field.type === 'number' && (
                        <TextField
                          label="Value"
                          type="number"
                          value={field.value || ''}
                          onChange={(e) => updateField(index, { value: parseFloat(e.target.value) || undefined })}
                          sx={{ width: 100 }}
                        />
                      )}
                      {formData.fields.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => removeField(index)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addField}
                    variant="outlined"
                  >
                    Add Field
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* User Assignment Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Assign Users ({formData.assigned_users.length} selected)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {users.map((user) => (
                    <FormControlLabel
                      key={user._id}
                      control={
                        <Checkbox
                          checked={formData.assigned_users.includes(user._id)}
                          onChange={() => toggleUserAssignment(user._id)}
                        />
                      }
                      label={`${user.username} (${user.email})`}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Widgets Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Widgets ({formData.widgets.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {formData.widgets.map((widget) => (
                    <Box key={widget.id} sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">Widget {widget.id}</Typography>
                        <IconButton
                          color="error"
                          onClick={() => removeWidget(widget.id)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          label="Widget Title"
                          value={widget.title}
                          onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                        />
                        
                        <FormControl>
                          <InputLabel>Widget Type</InputLabel>
                          <Select
                            value={widget.type}
                            onChange={(e) => updateWidget(widget.id, { type: e.target.value })}
                            label="Widget Type"
                          >
                            <MenuItem value="chart">Chart</MenuItem>
                            <MenuItem value="numeric">Numeric Display</MenuItem>
                            <MenuItem value="bar">Bar Graph</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl>
                          <InputLabel>Field</InputLabel>
                          <Select
                            value={widget.field}
                            onChange={(e) => updateWidget(widget.id, { field: e.target.value })}
                            label="Field"
                          >
                            {formData.fields.map((field, index) => (
                              <MenuItem key={index} value={field.name}>
                                {field.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {widget.type === 'chart' && (
                          <>
                            <FormControl>
                              <InputLabel>Chart Type</InputLabel>
                              <Select
                                value={widget.chartType}
                                onChange={(e) => updateWidget(widget.id, { chartType: e.target.value })}
                                label="Chart Type"
                              >
                                <MenuItem value="line">Line</MenuItem>
                                <MenuItem value="bar">Bar</MenuItem>
                                <MenuItem value="area">Area</MenuItem>
                                <MenuItem value="scatter">Scatter</MenuItem>
                              </Select>
                            </FormControl>
                            
                            <FormControl>
                              <InputLabel>Time Range</InputLabel>
                              <Select
                                value={widget.timeRange}
                                onChange={(e) => updateWidget(widget.id, { timeRange: e.target.value })}
                                label="Time Range"
                              >
                                <MenuItem value="1h">1 Hour</MenuItem>
                                <MenuItem value="6h">6 Hours</MenuItem>
                                <MenuItem value="24h">24 Hours</MenuItem>
                                <MenuItem value="7d">7 Days</MenuItem>
                                <MenuItem value="30d">30 Days</MenuItem>
                              </Select>
                            </FormControl>
                            
                            <FormControl>
                              <InputLabel>Aggregation Interval</InputLabel>
                              <Select
                                value={widget.aggregationInterval}
                                onChange={(e) => updateWidget(widget.id, { aggregationInterval: e.target.value })}
                                label="Aggregation Interval"
                              >
                                <MenuItem value="1m">1 Minute</MenuItem>
                                <MenuItem value="5m">5 Minutes</MenuItem>
                                <MenuItem value="15m">15 Minutes</MenuItem>
                                <MenuItem value="1h">1 Hour</MenuItem>
                                <MenuItem value="1d">1 Day</MenuItem>
                              </Select>
                            </FormControl>
                          </>
                        )}

                        {widget.type === 'numeric' && (
                          <TextField
                            label="Unit"
                            value={widget.unit || ''}
                            onChange={(e) => updateWidget(widget.id, { unit: e.target.value })}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addWidget}
                    variant="outlined"
                  >
                    Add Widget
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={editingDashboard ? handleUpdateDashboard : handleCreateDashboard}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {editingDashboard ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Dashboard Details
        </DialogTitle>
        <DialogContent>
          {detailsDashboard && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="h6" color="primary">
                {detailsDashboard.name}
              </Typography>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  API Key
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  p: 1, 
                  bgcolor: 'grey.100', 
                  borderRadius: 1,
                  fontFamily: 'monospace'
                }}>
                  <Typography variant="body2">{detailsDashboard.api_key}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(detailsDashboard.api_key)}
                    title="Copy API Key"
                  >
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Assigned Users ({detailsDashboard.assigned_users.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {detailsDashboard.assigned_users.length > 0 ? (
                    users
                      .filter(user => detailsDashboard.assigned_users.includes(user._id))
                      .map(user => (
                        <Chip
                          key={user._id}
                          label={`${user.username} (${user.email})`}
                          size="small"
                          variant="outlined"
                        />
                      ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No users assigned
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Fields ({detailsDashboard.fields.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {detailsDashboard.fields.map((field, index) => (
                    <Chip
                      key={index}
                      label={`${field.name} (${field.type})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Widgets ({detailsDashboard.widgets.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {detailsDashboard.widgets.map((widget) => (
                    <Chip
                      key={widget.id}
                      label={`${widget.title} (${widget.type})`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatIST(detailsDashboard.created_at)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {formatIST(detailsDashboard.updated_at)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

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

export default DashboardManagement; 