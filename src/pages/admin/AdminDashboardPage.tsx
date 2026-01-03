import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsDashboard } from '../../components/admin/AnalyticsDashboard'; // Import the new component

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleManageUsers = () => {
    navigate('/admin?tab=users');
  };

  const handleAddNewClass = () => {
    navigate('/admin?tab=classes');
  };

  const handleUploadContent = () => {
    navigate('/admin?tab=content');
  };

  return (
    <AnalyticsDashboard />
  );
};
