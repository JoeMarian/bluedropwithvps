import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  AppBar,
  Toolbar,
  Paper,
  Chip,
  Divider,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatIST } from '../../utils/date';
import { API_BASE_URL } from '../../config/api';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';

interface DashboardField {
  name: string;
  type: string;
  unit?: string;
  value?: number;
  last_update?: string;
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
  comparison?: string;
  value?: number;
  color?: string;
  rules?: { comparison: string; value: number; color: string }[];
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

interface DataPoint {
  id: string;
  dashboard_id: string;
  field_name: string;
  value: number;
  timestamp: string;
  metadata?: any;
}

const DashboardViewer: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetData, setWidgetData] = useState<Record<string, DataPoint[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [dashboardData, setDashboardData] = useState<Dashboard | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addField, setAddField] = useState<string>('');
  const [addDate, setAddDate] = useState('');
  const [addTime, setAddTime] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addMode, setAddMode] = useState<'edit'|'new'|null>(null);
  const [addError, setAddError] = useState<string|null>(null);
  const [addSuccess, setAddSuccess] = useState<string|null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Move refreshDashboard to component scope
  const refreshDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/dashboards/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const updatedDashboard: Dashboard = await response.json();
        setDashboardData(updatedDashboard);
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Refresh dashboard data every 30 seconds to get updated field values
  useEffect(() => {
    // Initial refresh
    refreshDashboard();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(refreshDashboard, 30000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    // Fetch data for all widgets when dashboard changes
    if (dashboardData) {
    dashboardData.widgets.forEach(widget => {
      fetchWidgetData(widget.field);
    });
    }
  }, [dashboardData]);

  const fetchWidgetData = async (fieldName: string) => {
    try {
      setLoading(prev => ({ ...prev, [fieldName]: true }));
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/dashboard/${id}/field/${fieldName}/data?hours=24&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch widget data');
      }

      const data: DataPoint[] = await response.json();
      setWidgetData(prev => ({ ...prev, [fieldName]: data }));
    } catch (error) {
      console.error(`Error fetching data for field ${fieldName}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const refreshWidgetData = (fieldName: string) => {
    fetchWidgetData(fieldName);
  };

  const formatChartData = (dataPoints: DataPoint[]) => {
    return dataPoints.map(point => ({
      time: formatIST(point.timestamp, { hour: '2-digit', minute: '2-digit' }),
      value: point.value,
      timestamp: point.timestamp
    }));
  };

  const getLatestValue = (fieldName: string): number => {
    const data = widgetData[fieldName];
    if (data && data.length > 0) {
      return data[data.length - 1].value;
    }
    return 0;
  };

  const getFieldLastUpdate = (fieldName: string): string => {
    const field = dashboardData?.fields.find(f => f.name === fieldName);
    if (field && field.last_update) {
      return formatIST(field.last_update, { dateStyle: 'medium', timeStyle: 'short' });
    }
    // Fallback: use latest data point timestamp if available
    const data = widgetData[fieldName];
    if (data && data.length > 0) {
      return formatIST(data[data.length - 1].timestamp, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return 'No data';
  };

  const handleOpenAddDialog = (fieldName: string) => {
    setAddField(fieldName);
    setAddDate('');
    setAddTime('');
    setAddValue('');
    setAddMode(null);
    setAddError(null);
    setAddSuccess(null);
    setAddDialogOpen(true);
  };
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
  };
  const handleCheckData = async () => {
    setAddError(null);
    setAddSuccess(null);
    setAddMode(null);
    if (!addField || !addDate || !addTime) {
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
        `${API_BASE_URL}/dashboard/${id}/field/${addField}/data?start=${dateObj.toISOString()}&end=${nextDay.toISOString()}&limit=500`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!resp.ok) throw new Error('Failed to fetch data');
      const data: DataPoint[] = await resp.json();
      // Find by hh:mm
      const [hh, mm] = addTime.split(':');
      const found = data.find(d => {
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
    if (!addField || !addDate || !addTime || addValue === '') {
      setAddError('All fields are required.');
      return;
    }
    setAddLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isoTimestamp = new Date(`${addDate}T${addTime}:00`).toISOString();
      const payload = {
        dashboard_id: id,
        field_name: addField,
        value: parseFloat(addValue),
        timestamp: isoTimestamp
      };
      const resp = await fetch(
        `${API_BASE_URL}/dashboard/${id}/field/${addField}/data`,
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
      refreshDashboard();
      setTimeout(() => setAddDialogOpen(false), 1200);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add/update data.');
    } finally {
      setAddLoading(false);
    }
  };

  const renderWidget = (widget: Widget) => {
    const field = dashboardData?.fields.find(f => f.name === widget.field);
    const data = widgetData[widget.field] || [];
    const chartData = formatChartData(data);
    const latestValue = getLatestValue(widget.field);
    const isLoading = loading[widget.field];
    
    // In renderWidget, add support for indicator widgets
    if (widget.type === 'indicator') {
      // Always use the latest value from data points
      const rules = widget.rules && widget.rules.length > 0 ? widget.rules : [{ comparison: '>=', value: 0, color: 'green' }];
      const value = getLatestValue(widget.field);
      let matchedColor = null;
      for (const rule of rules) {
        switch (rule.comparison) {
          case '>=':
            if (value >= rule.value) matchedColor = rule.color;
            break;
          case '<=':
            if (value <= rule.value) matchedColor = rule.color;
            break;
          case '>':
            if (value > rule.value) matchedColor = rule.color;
            break;
          case '<':
            if (value < rule.value) matchedColor = rule.color;
            break;
          case '==':
            if (value === rule.value) matchedColor = rule.color;
            break;
          default:
            break;
        }
        if (matchedColor) break;
      }
      const colorMap: Record<string, string> = {
        red: '#e53935',
        green: '#43a047',
        yellow: '#fbc02d',
        blue: '#1e88e5',
        orange: '#fb8c00',
        purple: '#8e24aa',
      };
      const circleColor = matchedColor ? colorMap[matchedColor] || '#43a047' : '#bdbdbd';
      return (
        <Card key={widget.id} sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: circleColor,
                  mb: 2,
                  boxShadow: matchedColor ? `0 0 0 4px ${circleColor}33` : undefined,
                  border: matchedColor ? '3px solid #fff' : '3px dashed #eee',
                  transition: 'background 0.3s',
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{widget.title}</Typography>
              {widget.field && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Field: {widget.field}
                </Typography>
              )}
              {/* Show all rules for admin reference */}
              <Box sx={{ mb: 1 }}>
                {rules.map((rule, idx) => (
                  <Typography key={idx} variant="caption" color="text.secondary" display="block">
                    {rule.comparison} {rule.value} → {rule.color}
                  </Typography>
                ))}
              </Box>
              <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card key={widget.id} sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{widget.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={widget.type} 
                size="small" 
                color={widget.type === 'chart' ? 'primary' : widget.type === 'numeric' ? 'secondary' : 'success'} 
              />
              <IconButton 
                size="small" 
                onClick={() => refreshWidgetData(widget.field)}
                disabled={isLoading}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {isLoading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          )}
          
          {widget.type === 'chart' && (
            <Box sx={{ height: 250 }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="h4" color="primary">
                  {field?.value !== undefined && field?.value !== null ? field.value : latestValue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {field?.unit || ''}
                </Typography>
              </Box>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      domain={[0, 'dataMax + 10']}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value} ${field?.unit || ''}`, 'Value']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2196f3" 
                      strokeWidth={2}
                      dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#2196f3', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: 150, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  LINE CHART | Field: {field?.name || 'Field Name'}
                </Typography>
              </Box>
            </Box>
          )}
          
          {widget.type === 'numeric' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h2" color="primary" gutterBottom>
                {field?.value !== undefined && field?.value !== null ? field.value : latestValue}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {field?.unit || ''}
              </Typography>
              <Chip label={widget.type.toUpperCase()} size="small" color="secondary" />
            </Box>
          )}
          
          {widget.type === 'bar' && (
            <Box sx={{ height: 250 }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="h4" color="primary">
                  {field?.value !== undefined && field?.value !== null ? field.value : latestValue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {field?.unit || ''}
                </Typography>
              </Box>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      domain={[0, 'dataMax + 10']}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value} ${field?.unit || ''}`, 'Value']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#4caf50"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: 150, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  BAR GRAPH | Field: {field?.name || 'Field Name'}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Fallback for unknown widget types */}
          {!['chart', 'numeric', 'bar', 'indicator'].includes(widget.type) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="error">
                Unknown widget type: {widget.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Value: {field?.value !== undefined && field?.value !== null ? field.value : 'N/A'}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Last Updated: {getFieldLastUpdate(widget.field)}
            </Typography>
            {data.length > 0 && (
              <Typography variant="caption" color="text.secondary" display="block">
                Data Points: {data.length} | Latest: {formatIST(data[data.length - 1]?.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderFieldCard = (field: DashboardField) => {
    // Get the latest data for this field to show actual last update time
    // const fieldData = widgetData[field.name] || [];
    // const lastUpdateTime = fieldData.length > 0 
    //   ? formatIST(fieldData[fieldData.length - 1].timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    //   : 'No data';

    return (
      <Card key={field.name} sx={{ height: '100%', position: 'relative' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {field.name}
            <IconButton size="small" color="secondary" sx={{ ml: 1 }} onClick={() => handleOpenAddDialog(field.name)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Typography>
          <Typography variant="h4" color="primary">
            {field.value !== undefined && field.value !== null ? field.value : 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {field.unit || ''}
          </Typography>
          <Chip label={field.type} size="small" sx={{ mt: 1 }} />
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Last Updated: {getFieldLastUpdate(field.name)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (!dashboardData) {
  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      bgcolor: 'background.default',
      zIndex: 1300,
      overflow: 'auto'
    }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Dashboard Not Found
          </Typography>
            <IconButton onClick={() => navigate('/admin/dashboards')}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Dashboard with ID {id} not found.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please check the dashboard ID or return to the list.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <IconButton onClick={() => navigate('/admin/dashboards')}>
              Back to Dashboards
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Button variant="outlined" onClick={() => navigate('/admin/dashboards')} sx={{ mb: 2 }}>
        Back to Manage Dashboards
      </Button>
      <Box sx={{ p: 3 }}>
        {/* Dashboard Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {dashboardData.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {dashboardData.description || 'No description provided'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip label={`API Key: ${dashboardData.api_key}`} size="small" variant="outlined" />
            <Chip label={`Created: ${formatIST(dashboardData.created_at)}`} size="small" />
            <Chip label={`Updated: ${formatIST(dashboardData.updated_at)}`} size="small" />
          </Box>
        </Box>

        {/* Current Time */}
        <Paper sx={{ p: 2, mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="primary">
            {formatIST(currentTime, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
          </Typography>
        </Paper>

        {/* Fields Section */}
        {dashboardData.fields.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Fields
            </Typography>
            <Grid container spacing={3}>
              {dashboardData.fields.map((field) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={field.name}>
                  {renderFieldCard(field)}
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Widgets Section */}
        {dashboardData.widgets.length > 0 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Widgets
            </Typography>
            <Grid container spacing={3}>
              {dashboardData.widgets.map((widget) => (
                <Grid item xs={12} sm={6} md={4} key={widget.id}>
                  {renderWidget(widget)}
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {dashboardData.fields.length === 0 && dashboardData.widgets.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No fields or widgets configured for this dashboard
            </Typography>
          </Box>
        )}
      </Box>
      {/* Add Previous Data Dialog */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          Add/Edit Previous Data
          <IconButton onClick={handleCloseAddDialog} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
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
              {dashboardData?.fields.map(f => (
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
            onClick={addMode ? handleSubmitAddData : handleCheckData}
            disabled={addLoading}
          >
            {addMode ? (addMode === 'edit' ? 'Update Data' : 'Add Data') : 'Check for Previous Data'}
          </Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default DashboardViewer; 