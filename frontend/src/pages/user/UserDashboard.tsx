import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Container,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Refresh as RefreshIcon
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

const UserDashboard: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [widgetData, setWidgetData] = useState<Record<string, DataPoint[]>>({});
  const [widgetLoading, setWidgetLoading] = useState<Record<string, boolean>>({});
  const [viewingDashboard, setViewingDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetchUserDashboards();
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchUserDashboards = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/dashboards/my-dashboards`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboards');
      }

      const data = await response.json();
      setDashboards(data);
      
      // Fetch data for all widgets in all dashboards
      data.forEach((dashboard: Dashboard) => {
        dashboard.widgets.forEach(widget => {
          fetchWidgetData(widget.field, dashboard._id);
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchWidgetData = async (fieldName: string, dashboardId: string) => {
    try {
      const key = `${dashboardId}_${fieldName}`;
      setWidgetLoading(prev => ({ ...prev, [key]: true }));
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/dashboard/${dashboardId}/field/${fieldName}/data?hours=24&limit=50`,
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
      setWidgetData(prev => ({ ...prev, [key]: data }));
    } catch (error) {
      console.error(`Error fetching data for field ${fieldName}:`, error);
    } finally {
      const key = `${dashboardId}_${fieldName}`;
      setWidgetLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const refreshWidgetData = (fieldName: string, dashboardId: string) => {
    fetchWidgetData(fieldName, dashboardId);
  };

  const formatChartData = (dataPoints: DataPoint[]) => {
    return dataPoints.map(point => ({
      time: formatIST(point.timestamp, { hour: '2-digit', minute: '2-digit' }),
      value: point.value,
      timestamp: point.timestamp
    }));
  };

  const getLatestValue = (fieldName: string, dashboardId: string): number => {
    const key = `${dashboardId}_${fieldName}`;
    const data = widgetData[key];
    if (data && data.length > 0) {
      return data[data.length - 1].value;
    }
    return 0;
  };

  const getLastUpdateTime = (fieldName: string, dashboardId: string): string => {
    const key = `${dashboardId}_${fieldName}`;
    const data = widgetData[key];
    if (data && data.length > 0) {
      const latestTimestamp = data[data.length - 1].timestamp;
      return formatIST(latestTimestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return 'No data';
  };

  const getDashboardLastUpdated = (dashboard: Dashboard): string => {
    let times: string[] = [];
    dashboard.fields.forEach(f => {
      const key = `${dashboard._id}_${f.name}`;
      const data = widgetData[key];
      if (data && data.length > 0) times.push(data[data.length - 1].timestamp);
    });
    if (times.length === 0) return formatIST(dashboard.updated_at);
    const latest = times.sort().reverse()[0];
    return formatIST(latest, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const renderFieldsTable = (dashboard: Dashboard) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Field Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell align="right">Latest Value</TableCell>
            <TableCell align="right">Last Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dashboard.fields.map(field => {
            const key = `${dashboard._id}_${field.name}`;
            const data = widgetData[key] || [];
            const latest = data.length > 0 ? data[data.length - 1] : null;
            return (
              <TableRow key={field.name}>
                <TableCell>{field.name}</TableCell>
                <TableCell>{field.type}</TableCell>
                <TableCell>{field.unit || '-'}</TableCell>
                <TableCell align="right">{latest ? latest.value : 'N/A'}</TableCell>
                <TableCell align="right">{latest ? formatIST(latest.timestamp, { dateStyle: 'medium', timeStyle: 'short' }) : 'No data'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderWidget = (widget: Widget, dashboard: Dashboard) => {
    const field = dashboard.fields.find(f => f.name === widget.field);
    const key = `${dashboard._id}_${widget.field}`;
    const data = widgetData[key] || [];
    const chartData = formatChartData(data);
    const latestValue = getLatestValue(widget.field, dashboard._id);
    const isLoading = widgetLoading[key];
    
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
                onClick={() => refreshWidgetData(widget.field, dashboard._id)}
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
                  {latestValue.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {field?.unit || 'units'}
                </Typography>
              </Box>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      domain={['dataMin - 10', 'dataMax + 10']}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value} ${field?.unit || ''}`, 'Value']}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#1976d2', strokeWidth: 2 }}
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
                  {widget.chartType?.toUpperCase() || 'LINE'} Chart | {widget.timeRange || '24h'} | {widget.aggregationInterval || '1h'}
                </Typography>
              </Box>
            </Box>
          )}
          
          {widget.type === 'numeric' && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animated background elements */}
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                animation: 'pulse 2s infinite'
              }} />
              <Box sx={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                animation: 'pulse 2s infinite 1s'
              }} />
              
              <Typography variant="h1" sx={{ fontWeight: 'bold', mb: 1, position: 'relative', zIndex: 1 }}>
                {latestValue.toFixed(1)}
              </Typography>
              <Typography variant="h5" sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
                {field?.unit || 'units'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
                {field?.name || 'Field Name'}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, position: 'relative', zIndex: 1 }}>
                <Chip label="NUMERIC" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip label="DISPLAY" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              </Box>
              
              <style>
                {`
                  @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.1); opacity: 0.3; }
                    100% { transform: scale(1); opacity: 0.7; }
                  }
                `}
              </style>
            </Box>
          )}
          
          {widget.type === 'bar' && (
            <Box sx={{ height: 250 }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="h4" color="success.main">
                  {latestValue.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {field?.unit || 'units'}
                </Typography>
              </Box>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
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
              Last Updated: {getLastUpdateTime(widget.field, dashboard._id)}
            </Typography>
            {data.length > 0 && (
              <Typography variant="caption" color="text.secondary" display="block">
                Data Points: {data.length} | Latest: {getLastUpdateTime(widget.field, dashboard._id)}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading your dashboards...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (dashboards.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">
          You don't have any dashboards assigned to you yet. Please contact an administrator.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Dashboards
      </Typography>
      <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
        {formatIST(currentTime, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
      </Typography>
      {dashboards.map((dashboard) => (
        <Box key={dashboard._id} sx={{ mb: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  {dashboard.name}
                </Typography>
                <Button variant="outlined" onClick={() => setViewingDashboard(dashboard)}>
                  View
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {dashboard.description}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ))}

      {/* Full-screen view dialog */}
      <Dialog open={!!viewingDashboard} onClose={() => setViewingDashboard(null)} maxWidth="lg" fullWidth fullScreen>
        <DialogTitle>
          {viewingDashboard?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
            {viewingDashboard?.description}
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            Last Updated: {viewingDashboard ? getDashboardLastUpdated(viewingDashboard) : ''}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {viewingDashboard && renderFieldsTable(viewingDashboard)}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mb: 2 }}>Widgets</Typography>
          <Grid container spacing={3}>
            {viewingDashboard?.widgets.map((widget) => (
              <Grid item xs={12} sm={6} md={4} key={widget.id}>
                {renderWidget(widget, viewingDashboard)}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingDashboard(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserDashboard; 