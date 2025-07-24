import React from 'react';
import AdminLayout from './AdminLayout';
import UserManagement from './UserManagement';

const ManageUsers: React.FC = () => (
  <AdminLayout>
    <UserManagement />
  </AdminLayout>
);

export default ManageUsers; 