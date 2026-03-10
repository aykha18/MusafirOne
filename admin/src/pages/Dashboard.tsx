import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardStats } from '../services/dashboard.service';
import { Users, AlertCircle, Package, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeDisputes: 0,
    totalParcels: 0,
    totalCurrencyPosts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
        setError(null);
      } catch (error: any) {
        console.error('Failed to fetch dashboard stats', error);
        setError(error.response?.data?.message || 'Failed to load dashboard data. Please check your connection or permissions.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={24} className="text-blue-500" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Active Disputes"
          value={stats.activeDisputes}
          icon={<AlertCircle size={24} className="text-red-500" />}
          bgColor="bg-red-50"
        />
        <StatCard
          title="Total Parcels"
          value={stats.totalParcels}
          icon={<Package size={24} className="text-green-500" />}
          bgColor="bg-green-50"
        />
        <StatCard
          title="Currency Posts"
          value={stats.totalCurrencyPosts}
          icon={<RefreshCw size={24} className="text-purple-500" />}
          bgColor="bg-purple-50"
        />
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        {icon}
      </div>
    </div>
  );
};

export default Dashboard;
