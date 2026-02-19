import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';

interface Stats {
  todayOmzet: number;
  todayCommission: number;
  totalCommission: number;
  monthlyOmzet: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    todayOmzet: 0,
    todayCommission: 0,
    totalCommission: 0,
    monthlyOmzet: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const branchId = user.branch_id || 'all'; // Placeholder if no branch
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const data = await api.get<Stats>(`/omzet/stats?branchId=${branchId}&month=${month}&year=${year}`);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Selamat datang, ${user?.nama}`}
      />

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8"
        role="region"
        aria-label="Ringkasan statistik"
      >
        <StatCard
          icon={TrendingUp}
          iconBgClass="bg-blue-50 dark:bg-blue-900/20"
          iconColorClass="text-blue-600 dark:text-blue-400"
          label="Omzet Hari Ini"
          value={formatCurrency(stats.todayOmzet)}
          staggerClass="stagger-1"
        />
        <StatCard
          icon={DollarSign}
          iconBgClass="bg-green-50 dark:bg-green-900/20"
          iconColorClass="text-green-600 dark:text-green-400"
          label="Komisi Hari Ini"
          value={formatCurrency(stats.todayCommission)}
          staggerClass="stagger-2"
        />
        <StatCard
          icon={Calendar}
          iconBgClass="bg-yellow-50 dark:bg-yellow-900/20"
          iconColorClass="text-yellow-600 dark:text-yellow-400"
          label="Omzet Bulan Ini"
          value={formatCurrency(stats.monthlyOmzet)}
          staggerClass="stagger-3"
        />
        <StatCard
          icon={Users}
          iconBgClass="bg-red-50 dark:bg-red-900/20"
          iconColorClass="text-red-600 dark:text-red-400"
          label="Total Komisi"
          value={formatCurrency(stats.totalCommission)}
          staggerClass="stagger-4"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up stagger-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Informasi Sistem</h2>
        <dl className="space-y-3">
          <div className="flex gap-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Username:</dt>
            <dd className="text-sm font-semibold text-gray-900 dark:text-white">{user?.username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nama:</dt>
            <dd className="text-sm font-semibold text-gray-900 dark:text-white">{user?.nama}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role:</dt>
            <dd className="text-sm font-semibold text-gray-900 dark:text-white uppercase">{user?.role}</dd>
          </div>
          {user?.faktor_pengali && (
            <div className="flex gap-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Faktor Pengali:</dt>
              <dd className="text-sm font-semibold text-gray-900 dark:text-white">{user.faktor_pengali}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
