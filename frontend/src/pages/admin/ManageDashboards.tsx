import React from 'react';
import AdminLayout from './AdminLayout';
import DashboardManagement from './DashboardManagement';

const ManageDashboards: React.FC = () => (
  <AdminLayout>
    <DashboardManagement />
  </AdminLayout>
);

export default ManageDashboards; 