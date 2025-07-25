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
  Divider,
  Paper,
  Tooltip,
  Fab,
  ListItemText
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Visibility as ViewIcon,
  Info as DetailsIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { api } from '../../contexts/AuthContext';
import { formatIST } from '../../utils/date';
import { useNavigate } from 'react-router-dom';
// Remove DateTimePicker and dayjs imports

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
  // Remove single comparison/value/color
  // comparison?: string;
  // value?: number;
  // color?: string;
  // Add rules for indicator
  rules?: { comparison: string; value: number; color: string }[];
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
  const navigate = useNavigate();
  // On mount, set tab based on location.pathname
  // On tab change, use navigate to update the route
  // Remove viewingDashboard state and modal logic
  // Use <Button onClick={() => navigate(`/admin/dashboards/${dashboard._id}`)} ...>View Dashboard</Button>
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [detailsDashboard, setDetailsDashboard] = useState<Dashboard | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
    fields: [{ name: '', type: 'number', unit: '', value: undefined }] as any[],
    widgets: [] as Widget[],
    assigned_users: [] as string[]
  });
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [addField, setAddField] = useState<string>('');
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addMode, setAddMode] = useState<'edit'|'new'|null>(null);
  const [addError, setAddError] = useState<string|null>(null);
  const [addSuccess, setAddSuccess] = useState<string|null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [openCsvDialog, setOpenCsvDialog] = useState(false);
  const [csvDashboard, setCsvDashboard] = useState<Dashboard | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [csvStart, setCsvStart] = useState('');
  const [csvEnd, setCsvEnd] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchDashboards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dashboards/');
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
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchDashboards();
    fetchUsers();
    // Fetch user role from API or context (assuming /me endpoint returns user info)
    api.get('/me').then(() => {}).catch(() => {});
  }, []);

  const handleCreateDashboard = async () => {
    try {
      // Filter out empty fields
      const validFields = formData.fields.filter(field => field.name.trim() !== '');
      const dashboardData = {
        ...formData,
        fields: validFields,
        widgets: formData.widgets, // do not overwrite rules
      };
      console.log('Creating dashboard with data:', dashboardData);
      await api.post('/dashboards/', dashboardData);
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
        fields: validFields,
        widgets: formData.widgets, // do not overwrite rules
      };
      console.log('Updating dashboard with data:', dashboardData);
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
      const deleteResponse = await api.delete(`/dashboards/${dashboardId}`);
      console.log('Delete response:', deleteResponse.data);
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

  const updateField = (index: number, field: Partial<DashboardField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...field } : f)
    }));
  };

  // Only set default rules when creating a new indicator widget
  const addWidget = () => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: 'indicator',
      title: '',
      field: '',
      rules: [
        { comparison: '>=', value: 0, color: 'green' }
      ],
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

  const handleOpenAddDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setAddField(dashboard.fields[0]?.name || '');
    setAddDate('');
    setAddTime('');
    setAddValue('');
    setAddMode(null);
    setAddError(null);
    setAddSuccess(null);
    setAddLoading(false); // Reset loading state for new dialog
    setAddDialogOpen(true);
  };
  const handleCloseAddDialog = () => {
    setAddLoading(false); // Reset loading state on close
    setSelectedDashboard(null);
    setAddDialogOpen(false);
  };
  const handleCheckData = async () => {
    setAddError(null);
    setAddSuccess(null);
    setAddMode(null);
    if (!addField || !addDate || !addTime || !selectedDashboard) {
      setAddError('Please select field, date, and time.');
      return;
    }
    setAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const dateObj = new Date(`${addDate}T00:00:00`);
      const nextDay = new Date(dateObj);
      nextDay.setDate(dateObj.getDate() + 1);
      // Fetch all data for that field for the selected day
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/dashboard/${selectedDashboard._id}/field/${addField}/data?start=${dateObj.toISOString()}&end=${nextDay.toISOString()}&limit=500`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!resp.ok) throw new Error('Failed to fetch data');
      const data = await resp.json();
      // Find by hh:mm
      const [hh, mm] = addTime.split(':');
      const found = data.find((d: any) => {
        const dt = new Date(d.timestamp);
        return dt.getHours() === parseInt(hh) && dt.getMinutes() === parseInt(mm);
      });
      if (found) {
        setAddMode('edit');
        setAddValue(found.value.toString());
        setAddSuccess('Previous data found. You can update the value.');
      } else {
        setAddMode('new');
        setAddValue('');
        setAddSuccess('No previous data at this time. You can add new data.');
      }
    } catch (err) {
      setAddError('Failed to check for previous data.');
    } finally {
      setAddLoading(false);
    }
  };
  const handleSubmitAddData = async () => {
    setAddError(null);
    setAddSuccess(null);
    if (!addField || !addDate || !addTime || addValue === '' || !selectedDashboard) {
      setAddError('All fields are required.');
      return;
    }
    setAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isoTimestamp = new Date(`${addDate}T${addTime}:00`).toISOString();
      const payload = {
        dashboard_id: selectedDashboard._id,
        field_name: addField,
        value: parseFloat(addValue),
        timestamp: isoTimestamp
      };
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/dashboard/${selectedDashboard._id}/field/${addField}/data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.detail || 'Failed to add/update data');
      }
      setAddSuccess(addMode === 'edit' ? 'Data updated successfully.' : 'Data added successfully.');
      fetchDashboards();
      setTimeout(() => setAddDialogOpen(false), 1200);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add/update data.');
    } finally {
      setAddLoading(false);
    }
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
        <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', mb: 4, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)' }}>
          <>
        <Grid container spacing={3}>
          {dashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard._id}>
                  <Card sx={{ '&:hover': { boxShadow: 6 } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div">
                      {dashboard.name}
                    </Typography>
                    <Box>
                          <Tooltip title="Edit Dashboard">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(dashboard)}
                      >
                        <EditIcon />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="View Full Screen">
                      <IconButton
                        size="small"
                        color="primary"
                              onClick={() => navigate(`/admin/dashboards/${dashboard._id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleViewDetails(dashboard)}
                      >
                        <DetailsIcon />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Dashboard">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDashboard(dashboard._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Previous Data">
                            <IconButton size="small" color="secondary" onClick={() => handleOpenAddDialog(dashboard)}>
                              <AddIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download CSV">
                            <IconButton size="small" color="success" onClick={() => {
                              setCsvDashboard(dashboard);
                              setSelectedFields(dashboard.fields.map(f => f.name));
                              setCsvStart('');
                              setCsvEnd('');
                              setCsvError(null);
                              setOpenCsvDialog(true);
                            }}>
                              <ContentCopyIcon />
                            </IconButton>
                          </Tooltip>
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
            <Fab
              color="primary"
              aria-label="add"
              sx={{ position: 'fixed', bottom: 20, right: 20 }}
              onClick={() => setOpenDialog(true)}
            >
              <AddIcon />
            </Fab>
          </>
        </Paper>
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
                          required
                          value={field.value !== undefined ? field.value : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateField(index, { value: val === '' ? undefined : parseFloat(val) });
                          }}
                          sx={{ width: 100 }}
                        />
                      )}
                      {formData.fields.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              fields: prev.fields.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        fields: [...prev.fields, { name: '', type: 'number', unit: '', value: undefined }]
                      }));
                    }}
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
                            onChange={e => {
                              const type = e.target.value;
                              if (type === 'indicator') {
                                updateWidget(widget.id, { type, rules: widget.rules || [
                                  { comparison: '>=', value: 0, color: 'green' }
                                ] });
                              } else {
                                updateWidget(widget.id, { type });
                              }
                            }}
                            label="Widget Type"
                          >
                            <MenuItem value="chart">Chart</MenuItem>
                            <MenuItem value="numeric">Numeric Display</MenuItem>
                            <MenuItem value="bar">Bar Graph</MenuItem>
                            <MenuItem value="indicator">Indicator</MenuItem>
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

                        {widget.type === 'indicator' && (
                          <>
                            <FormControl sx={{ mt: 2 }}>
                              <InputLabel>Field</InputLabel>
                              <Select
                                value={widget.field}
                                onChange={e => updateWidget(widget.id, { field: e.target.value })}
                                label="Field"
                              >
                                <MenuItem value="">No Field</MenuItem>
                                {formData.fields.map((field, index) => (
                                  <MenuItem key={index} value={field.name}>{field.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {widget.rules?.map((rule, idx) => (
                                <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  <FormControl sx={{ minWidth: 100 }}>
                                    <InputLabel>Comparison</InputLabel>
                                    <Select
                                      value={rule.comparison}
                                      onChange={e => {
                                        const newRules = [...(widget.rules || [])];
                                        newRules[idx] = { ...newRules[idx], comparison: e.target.value };
                                        updateWidget(widget.id, { rules: newRules });
                                      }}
                                      label="Comparison"
                                    >
                                      <MenuItem value="<=">{'<='}</MenuItem>
                                      <MenuItem value=">=">{'>='}</MenuItem>
                                      <MenuItem value="<">{'<'}</MenuItem>
                                      <MenuItem value=">">{'>'}</MenuItem>
                                      <MenuItem value="==">{'=='}</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <TextField
                                    label="Value"
                                    type="number"
                                    value={rule.value}
                                    onChange={e => {
                                      const newRules = [...(widget.rules || [])];
                                      newRules[idx] = { ...newRules[idx], value: parseFloat(e.target.value) };
                                      updateWidget(widget.id, { rules: newRules });
                                    }}
                                    sx={{ width: 100 }}
                                  />
                                  <FormControl sx={{ minWidth: 100 }}>
                                    <InputLabel>Color</InputLabel>
                                    <Select
                                      value={rule.color}
                                      onChange={e => {
                                        const newRules = [...(widget.rules || [])];
                                        newRules[idx] = { ...newRules[idx], color: e.target.value };
                                        updateWidget(widget.id, { rules: newRules });
                                      }}
                                      label="Color"
                                    >
                                      <MenuItem value="red">Red</MenuItem>
                                      <MenuItem value="green">Green</MenuItem>
                                      <MenuItem value="yellow">Yellow</MenuItem>
                                      <MenuItem value="blue">Blue</MenuItem>
                                      <MenuItem value="orange">Orange</MenuItem>
                                      <MenuItem value="purple">Purple</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton color="error" onClick={() => {
                                    const newRules = (widget.rules || []).filter((_, i) => i !== idx);
                                    updateWidget(widget.id, { rules: newRules });
                                  }}>
                                    <RemoveIcon />
                                  </IconButton>
                      </Box>
                              ))}
                              <Button
                                startIcon={<AddIcon />}
                                onClick={() => {
                                  const newRules = [...(widget.rules || []), { comparison: '>=', value: 0, color: 'green' }];
                                  updateWidget(widget.id, { rules: newRules });
                                }}
                                variant="outlined"
                              >
                                Add Comparison Rule
                              </Button>
                            </Box>
                          </>
                        )}
                        {['chart', 'bar', 'numeric'].includes(widget.type) && (
                          <FormControl sx={{ mt: 2 }} required>
                            <InputLabel>Field</InputLabel>
                            <Select
                              value={widget.field || ''}
                              onChange={e => updateWidget(widget.id, { field: e.target.value })}
                              label="Field"
                            >
                              <MenuItem value="" disabled>Select Field</MenuItem>
                              {formData.fields.map((field, index) => (
                                <MenuItem key={index} value={field.name}>{field.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
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
                    <ContentCopyIcon />
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

      {/* Add Previous Data Dialog (new logic) */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Add/Edit Previous Data</DialogTitle>
        <DialogContent>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
          {addSuccess && <Alert severity="success" sx={{ mb: 2 }}>{addSuccess}</Alert>}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Field</InputLabel>
            <Select
              value={addField}
              label="Field"
              onChange={e => setAddField(e.target.value)}
            >
              {selectedDashboard?.fields.map(f => (
                <MenuItem key={f.name} value={f.name}>{f.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            fullWidth
            value={addDate}
            onChange={e => setAddDate(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Time (hh:mm)"
            type="time"
            fullWidth
            value={addTime}
            onChange={e => setAddTime(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }}
          />
          {(addMode === 'edit' || addMode === 'new') && (
            <TextField
              label="Value"
              type="number"
              fullWidth
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
          )}
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 1 }}
            onClick={addMode ? () => handleSubmitAddData() : handleCheckData}
            disabled={addLoading}
          >
            {addMode ? (addMode === 'edit' ? 'Update Data' : 'Add Data') : 'Check for Previous Data'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Download CSV Dialog */}
      <Dialog open={openCsvDialog} onClose={() => setOpenCsvDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Download CSV Data</DialogTitle>
        <DialogContent>
          {csvDashboard && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Fields</InputLabel>
                <Select
                  multiple
                  value={selectedFields}
                  onChange={e => setSelectedFields(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Fields"
                  renderValue={selected => (selected as string[]).join(', ')}
                >
                  {csvDashboard.fields.map((field, idx) => (
                    <MenuItem key={idx} value={field.name}>
                      <Checkbox checked={selectedFields.indexOf(field.name) > -1} />
                      <ListItemText primary={field.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Start Date/Time"
                type="datetime-local"
                fullWidth
                value={csvStart}
                onChange={e => setCsvStart(e.target.value)}
              />
              <TextField
                label="End Date/Time"
                type="datetime-local"
                fullWidth
                value={csvEnd}
                onChange={e => setCsvEnd(e.target.value)}
              />
              {csvError && <Alert severity="error">{csvError}</Alert>}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCsvDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!csvDashboard) return;
              if (!csvStart || !csvEnd || selectedFields.length === 0) {
                setCsvError('Please select fields and date range.');
                return;
              }
              setCsvError(null);
              try {
                const startISO = new Date(csvStart).toISOString();
                const endISO = new Date(csvEnd).toISOString();
                // Fetch data for each field
                const token = localStorage.getItem('token');
                const allData: Record<string, any[]> = {};
                for (const field of selectedFields) {
                  const resp = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/dashboard/${csvDashboard._id}/field/${field}/data?start=${startISO}&end=${endISO}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  );
                  if (!resp.ok) throw new Error('Failed to fetch data');
                  allData[field] = await resp.json();
                }
                // Merge by timestamp
                const allTimestamps = Array.from(new Set(
                  Object.values(allData).flat().map((d: any) => d.timestamp)
                )).sort();
                const rows = allTimestamps.map(ts => {
                  const row: any = { timestamp: ts };
                  for (const field of selectedFields) {
                    const found = (allData[field] || []).find((d: any) => d.timestamp === ts);
                    row[field] = found ? found.value : '';
                  }
                  return row;
                });
                // Generate CSV
                const header = ['timestamp', ...selectedFields];
                const csv = [header.join(',')].concat(
                  rows.map(row => header.map(h => row[h]).join(','))
                ).join('\n');
                // Download
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${csvDashboard.name}_data.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setOpenCsvDialog(false);
              } catch (err) {
                setCsvError('Failed to fetch or download data.');
              }
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardManagement; 