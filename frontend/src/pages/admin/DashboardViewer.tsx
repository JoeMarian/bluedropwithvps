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
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FullscreenExit as FullscreenExitIcon
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

interface DashboardViewerProps {
  dashboard: Dashboard;
  onClose: () => void;
}

const DashboardViewer: React.FC<DashboardViewerProps> = ({ dashboard, onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetData, setWidgetData] = useState<Record<string, DataPoint[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [dashboardData, setDashboardData] = useState<Dashboard>(dashboard);

  // Move refreshDashboard to component scope
  const refreshDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/dashboards/${dashboard._id}`,
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
  }, [dashboard._id]);

  useEffect(() => {
    // Fetch data for all widgets when dashboard changes
    dashboardData.widgets.forEach(widget => {
      fetchWidgetData(widget.field);
    });
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
        `${API_BASE_URL}/dashboard/${dashboard._id}/field/${fieldName}/data?hours=24&limit=50`,
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
    const field = dashboardData.fields.find(f => f.name === fieldName);
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

  const renderWidget = (widget: Widget) => {
    const field = dashboardData.fields.find(f => f.name === widget.field);
    const data = widgetData[widget.field] || [];
    const chartData = formatChartData(data);
    const latestValue = getLatestValue(widget.field);
    const isLoading = loading[widget.field];
    
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
          {!['chart', 'numeric', 'bar'].includes(widget.type) && (
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
      <Card key={field.name} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {field.name}
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
            {dashboardData.name} - Dashboard View
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`${dashboardData.fields.length} Fields`} 
              size="small" 
              color="secondary" 
            />
            <Chip 
              label={`${dashboardData.widgets.length} Widgets`} 
              size="small" 
              color="secondary" 
            />
            {dashboardData.is_public && (
              <Chip label="Public" size="small" color="success" />
            )}
            <IconButton color="inherit" onClick={refreshDashboard}>
              <RefreshIcon />
            </IconButton>
            <IconButton color="inherit" onClick={onClose}>
              <FullscreenExitIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
    </Box>
  );
};

export default DashboardViewer; 