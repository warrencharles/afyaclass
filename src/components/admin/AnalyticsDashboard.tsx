import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import api from '../../utils/api';
import { Users, BookOpen, TrendingUp, DollarSign, Clock, BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
} from 'recharts';

interface UserAnalytics {
  totalUsers: number;
  newUsersLast30Days: number;
}

interface ContentAnalytics {
  totalContent: number;
  contentByType: { type: string; count: number }[];
}

interface TrialAnalytics {
  examTrialStarts: number;
  examGuideTrialStarts: number;
}

interface PaymentAnalytics {
  totalPaymentRequests: number;
  paymentRequestsByStatus: { status: string; count: number }[];
  paymentRequestsOverTime: { date: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF69B4', '#82ca9d', '#ffc658'];

export const AnalyticsDashboard: React.FC = () => {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [contentAnalytics, setContentAnalytics] = useState<ContentAnalytics | null>(null);
  const [trialAnalytics, setTrialAnalytics] = useState<TrialAnalytics | null>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        console.log('Fetching analytics data...');
        const [
          userRes,
          contentRes,
          trialRes,
          paymentRes
        ] = await Promise.all([
          api.get('/admin/analytics/users'),
          api.get('/admin/analytics/content'),
          api.get('/admin/analytics/trials'),
          api.get('/admin/analytics/payments')
        ]);

        console.log('User Analytics:', userRes.data);
        console.log('Content Analytics:', contentRes.data);
        console.log('Trial Analytics:', trialRes.data);
        console.log('Payment Analytics:', paymentRes.data);

        setUserAnalytics(userRes.data);
        setContentAnalytics(contentRes.data);
        setTrialAnalytics(trialRes.data);
        setPaymentAnalytics(paymentRes.data);
      } catch (err: any) {
        console.error('Failed to fetch analytics data:', err);
        setError('Failed to load analytics data. Please ensure the backend server is running and accessible, and that the database contains data. Error details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics(); // Initial fetch

    const intervalId = setInterval(fetchAnalytics, 30000); // Fetch data every 30 seconds

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-600 text-2xl font-medium animate-pulse">Loading stunning analytics...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600 text-2xl font-semibold">{error}</div>;
  }

  // Prepare data for charts
  const contentPieData = contentAnalytics?.contentByType.map(item => ({
    name: item.type,
    value: item.count,
  })) || [];

  const paymentLineData = paymentAnalytics?.paymentRequestsOverTime.map(item => ({
    date: item.date,
    requests: item.count,
  })) || [];

  const paymentStatusData = paymentAnalytics?.paymentRequestsByStatus.map(item => ({
    name: item.status,
    count: item.count,
  })) || [];

  // Placeholder data for new users over 30 days
  const newUsersLineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i)); // Dates from 29 days ago to today
    return {
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * ((userAnalytics?.newUsersLast30Days || 0) / 10) + 1), // Distribute new users randomly
    };
  });


  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 sm:mb-10 md:mb-12 text-center tracking-tight leading-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-700">Admin Analytics</span> Overview
      </h1>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-12">
        <Card className="bg-white text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="p-3 sm:p-4 rounded-full bg-blue-100 text-blue-600 mb-3 sm:mb-4">
            <Users size={32} />
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900">{userAnalytics?.totalUsers ?? 'N/A'}</p>
          <p className="text-base sm:text-lg text-gray-500 mt-1">Total Users</p>
        </Card>

        <Card className="bg-white text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="p-3 sm:p-4 rounded-full bg-green-100 text-green-600 mb-3 sm:mb-4">
            <BookOpen size={32} />
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900">{contentAnalytics?.totalContent ?? 'N/A'}</p>
          <p className="text-base sm:text-lg text-gray-500 mt-1">Total Content</p>
        </Card>

        <Card className="bg-white text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="p-3 sm:p-4 rounded-full bg-purple-100 text-purple-600 mb-3 sm:mb-4">
            <TrendingUp size={32} />
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900">{(trialAnalytics?.examTrialStarts || 0) + (trialAnalytics?.examGuideTrialStarts || 0)}</p>
          <p className="text-base sm:text-lg text-gray-500 mt-1">Total Trials Started</p>
        </Card>

        <Card className="bg-white text-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="p-3 sm:p-4 rounded-full bg-yellow-100 text-yellow-600 mb-3 sm:mb-4">
            <DollarSign size={32} />
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900">{paymentAnalytics?.totalPaymentRequests ?? 'N/A'}</p>
          <p className="text-base sm:text-lg text-gray-500 mt-1">Total Payment Requests</p>
        </Card>
      </div>

      {/* Middle Row: User Growth & Content Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10 md:mb-12">
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center mb-4 sm:mb-6">
            <Users size={24} className="mr-3 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">New Users (Last 30 Days)</h2>
          </div>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={newUsersLineData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                <YAxis stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} itemStyle={{ color: '#333' }} labelStyle={{ color: '#333' }} />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 text-center">Simulated new user growth over the last month.</p>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center mb-4 sm:mb-6">
            <PieChartIcon size={24} className="mr-3 text-green-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Content Distribution by Type</h2>
          </div>
          <div className="h-56 sm:h-64">
            {contentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 'N/A'}%`}
                  >
                    {contentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-base sm:text-xl text-center text-gray-500">No content data available for chart.</p>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 text-center">Breakdown of learning materials by category.</p>
        </Card>
      </div>

      {/* Bottom Row: Payment & Trial Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center mb-4 sm:mb-6">
            <BarChartIcon size={24} className="mr-3 text-yellow-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Requests by Status</h2>
          </div>
          <div className="h-56 sm:h-64">
            {paymentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentStatusData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                  <YAxis stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} itemStyle={{ color: '#333' }} labelStyle={{ color: '#333' }} />
                  <Legend />
                  <Bar dataKey="count" fill="#FFBB28" animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-base sm:text-xl text-center text-gray-500">No payment status data available for chart.</p>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 text-center">Current status of all payment submissions.</p>
        </Card>

        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6 rounded-2xl border border-gray-100">
          <div className="flex items-center mb-4 sm:mb-6">
            <Clock size={24} className="mr-3 text-red-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Requests Over Time</h2>
          </div>
          <div className="h-56 sm:h-64">
            {paymentLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={paymentLineData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                  <YAxis stroke="#888" tick={{ fill: '#666', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    itemStyle={{ color: '#333' }}
                    labelStyle={{ color: '#333' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#FF69B4"
                    strokeWidth={2}
                    dot={{ stroke: '#FF69B4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#FF69B4', strokeWidth: 2, fill: '#FFD700' }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-base sm:text-xl text-center text-gray-500">No payment requests in the last 30 days.</p>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 text-center">Daily trend of payment submissions.</p>
        </Card>
      </div>

      <footer className="text-center text-gray-600 mt-8 sm:mt-10 md:mt-12 text-xs sm:text-sm">
        Analytics data is updated every 30 seconds.
      </footer>
    </div>
  );
};
