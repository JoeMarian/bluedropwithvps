import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UserLayout from './UserLayout';
import { api } from '../../contexts/AuthContext';

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
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [openCsvDialog, setOpenCsvDialog] = useState(false);
  const [csvDashboard, setCsvDashboard] = useState<Dashboard | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [csvStart, setCsvStart] = useState('');
  const [csvEnd, setCsvEnd] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const handleOpenCsvDialog = (dashboard: Dashboard) => {
    setCsvDashboard(dashboard);
    setSelectedFields(dashboard.fields.map(f => f.name));
    setCsvStart('');
    setCsvEnd('');
    setCsvError(null);
    setOpenCsvDialog(true);
  };
  const handleCloseCsvDialog = () => {
    setOpenCsvDialog(false);
    setCsvDashboard(null);
    setSelectedFields([]);
    setCsvStart('');
    setCsvEnd('');
    setCsvError(null);
  };
  const handleDownloadCsv = async () => {
    if (!csvDashboard) return;
    if (!csvStart || !csvEnd || selectedFields.length === 0) {
      setCsvError('Please select fields and date/time range.');
      return;
    }
    setCsvLoading(true);
    setCsvError(null);
    try {
      // Fetch data for all selected fields
      const startISO = new Date(csvStart).toISOString();
      const endISO = new Date(csvEnd).toISOString();
      // Fetch all data in one call if possible
      const resp = await api.get(`/dashboard/${csvDashboard._id}/data`, {
        params: { hours: 24 * 365, limit: 10000 } // get all, filter below
      });
      const allData = resp.data.fields || {};
      // Filter and merge by timestamp
      const rows: Record<string, Record<string, any>> = {};
      selectedFields.forEach(field => {
        (allData[field] || []).forEach((point: any) => {
          if (point.timestamp >= startISO && point.timestamp <= endISO) {
            if (!rows[point.timestamp]) rows[point.timestamp] = { timestamp: point.timestamp };
            rows[point.timestamp][field] = point.value;
          }
        });
      });
      // Sort timestamps
      const sortedTimestamps = Object.keys(rows).sort();
      // Build CSV
      const header = ['timestamp', ...selectedFields];
      const csv = [header.join(',')].concat(
        sortedTimestamps.map(ts =>
          header.map(col => rows[ts][col] !== undefined ? rows[ts][col] : '').join(',')
        )
      ).join('\n');
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${csvDashboard.name.replace(/\s+/g, '_')}_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      handleCloseCsvDialog();
    } catch (err: any) {
      setCsvError('Failed to fetch or process data.');
    } finally {
      setCsvLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboards/my-dashboards');
        setDashboards(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboards. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboards();
  }, []);
    
    return (
    <UserLayout>
      <Typography variant="h3" fontWeight={700} gutterBottom sx={{ letterSpacing: 1, mb: 4 }}>
        My Dashboards
      </Typography>
      {error && (
        <Paper sx={{ p: 3, mb: 3, background: 'rgba(255,0,0,0.05)' }}>
          <Typography color="error" fontWeight={600}>{error}</Typography>
        </Paper>
      )}
      <Grid container spacing={4}>
        {dashboards.map((dashboard) => (
          <Grid item xs={12} sm={6} md={4} key={dashboard._id}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 8 },
                minHeight: 220,
                  display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
                    {dashboard.name}
                  </Typography>
                  {dashboard.is_public && (
                    <Chip label="Public" color="success" size="small" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {dashboard.description || 'No description available'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`${dashboard.fields.length} Fields`} size="small" variant="outlined" />
                  <Chip label={`${dashboard.widgets.length} Widgets`} size="small" variant="outlined" />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(dashboard.created_at).toLocaleDateString()}
                </Typography>
        </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ fontWeight: 700, borderRadius: 3, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.10)' }}
                  onClick={() => navigate(`/dashboard/${dashboard._id}`)}
                >
                  View Dashboard
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  size="large"
                  sx={{ fontWeight: 700, borderRadius: 3, fontSize: '1.1rem', mt: 1 }}
                  onClick={() => handleOpenCsvDialog(dashboard)}
                >
                  Download CSV
                </Button>
              </Box>
          </Card>
          </Grid>
      ))}
      </Grid>
      {!loading && dashboards.length === 0 && !error && (
        <Paper sx={{ p: 4, mt: 6, textAlign: 'center', background: 'rgba(99,102,241,0.05)' }}>
          <Typography variant="h5" color="text.secondary">
            You don't have any dashboards assigned to you yet.<br />Please contact an administrator.
          </Typography>
        </Paper>
      )}
      {/* Download CSV Dialog */}
      <Dialog open={openCsvDialog} onClose={handleCloseCsvDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Download CSV Data</DialogTitle>
        <DialogContent>
          {csvError && <Alert severity="error" sx={{ mb: 2 }}>{csvError}</Alert>}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Fields</InputLabel>
            <Select
              multiple
              value={selectedFields}
              onChange={e => setSelectedFields(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={selected => (selected as string[]).join(', ')}
            >
              {csvDashboard?.fields.map(field => (
                <MenuItem key={field.name} value={field.name}>
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
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date/Time"
            type="datetime-local"
            fullWidth
            value={csvEnd}
            onChange={e => setCsvEnd(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCsvDialog}>Cancel</Button>
          <Button onClick={handleDownloadCsv} variant="contained" disabled={csvLoading}>
            {csvLoading ? 'Downloading...' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </UserLayout>
  );
};

export default UserDashboard; 