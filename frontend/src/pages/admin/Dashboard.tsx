import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';
import DashboardManagement from './DashboardManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  if (!user?.is_admin) {
    return (
      <Box p={3}>
        <Typography color="error">Access denied. Admin privileges required.</Typography>
      </Box>
    );
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="admin dashboard tabs"
          >
            <Tab label="Manage Users" />
            <Tab label="Manage Dashboards" />
          </Tabs>
        </Box>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <UserManagement />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <DashboardManagement />
      </TabPanel>
    </Box>
  );
};

export default AdminDashboard; 