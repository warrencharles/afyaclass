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
    <div className="p-6">
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
        {/* Integrate the new AnalyticsDashboard component */}
        <AnalyticsDashboard />
      </div>
    </div>
  );
};
