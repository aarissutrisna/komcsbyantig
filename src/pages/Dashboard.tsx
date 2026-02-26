import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { TrendingUp, DollarSign, Filter, Search, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Stats {
  todayOmzet: number;
  todayCommission: number;
  totalCommission: number;
  monthlyOmzet: number;
  minTarget: number;
  maxTarget: number;
  winRateMin: number;
  winRateMax: number;
  chartData: Array<{
    date: string;
    total: number;
    komisi: number;
    [key: string]: string | number;
  }>;
}

interface Branch {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  nama: string;
  branch_id: string;
  role: string;
}

interface ChartPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

const getBranchColor = (index: number) => {
  const colors = [
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#ef4444', // red
  ];
  return colors[index % colors.length];
};

export function Dashboard() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [stats, setStats] = useState<Stats>({
    todayOmzet: 0,
    todayCommission: 0,
    totalCommission: 0,
    monthlyOmzet: 0,
    minTarget: 0,
    maxTarget: 0,
    winRateMin: 0,
    winRateMax: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [previewToday, setPreviewToday] = useState<{ total: number; cash: number; piutang: number } | null>(null);

  const isHRD = user?.role === 'hrd';
  const isAdmin = user?.role === 'admin';
  const isCS = user?.role === 'cs';

  const fetchUsers = useCallback(async () => {
    // Admin/HRD might want to see all users initially
    const branchParam = (!selectedBranch || selectedBranch === 'all') ? '' : `?branchId=${selectedBranch}`;

    try {
      const data = await api.get<User[]>(`/auth/users${branchParam}`);
      const csOnly = (data || []).filter(u => u.role === 'cs');
      setUsers(csOnly);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [selectedBranch]);

  const fetchPreviewToday = useCallback(async (branchId: string) => {
    if (!branchId) return;
    setFetchingPreview(true);
    try {
      const data = await api.get<{ total: number; cash: number; piutang: number }>(`/omzet/preview-today?branchId=${branchId}`);
      setPreviewToday(data);
    } catch (err) {
      console.error('Failed to fetch preview data:', err);
    } finally {
      setFetchingPreview(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!user || !selectedBranch) return;
    setFetchingStats(true);

    try {
      const endpoint = `/omzet/stats?branchId=${selectedBranch}&month=${selectedMonth}&year=${selectedYear}&userId=${selectedUser}`;
      const data = await api.get<Stats>(endpoint);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setFetchingStats(false);
    }
  }, [user, selectedBranch, selectedMonth, selectedYear, selectedUser]);

  const fetchInitialData = useCallback(async () => {
    try {
      let bData: Branch[];
      if (isCS) {
        // CS: only see branches they've ever been assigned to
        bData = await api.get<Branch[]>('/penugasan/my-branches');

        // Ensure their home branch is in the list even if no penugasan yet
        if (user.branch_id && !bData.find(b => b.id === user.branch_id)) {
          // We need the branch name too, but for now we'll just query /branches if needed
          // or rely on bData being enough. Actually, let's fetch all branches and filter
          // to make it easier and more robust.
          const allBranches = await api.get<Branch[]>('/branches');
          const myHistoryIds = bData.map(b => b.id);
          bData = allBranches.filter(b => myHistoryIds.includes(b.id) || b.id === user.branch_id);
        }
      } else {
        bData = await api.get<Branch[]>('/branches');
      }
      setBranches(bData || []);

      // Determine initial branch:
      // - CS: use first penugasan branch OR home branch
      // - HRD: locked to their branch_id
      // - Admin: first branch or empty (can pick 'all')
      let initialBranch = '';
      if (isCS) {
        initialBranch = (bData && bData.length > 0 ? bData[0].id : '') || user.branch_id || '';
        setSelectedUser(user.id);
      } else if (isHRD) {
        initialBranch = user.branch_id || (bData && bData.length > 0 ? bData[0].id : '');
      } else {
        // admin — default to 'all' or first
        initialBranch = '';
        setSelectedBranch('all');
      }
      if (initialBranch) setSelectedBranch(initialBranch);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedBranch) {
      fetchPreviewToday(selectedBranch);
      fetchStats();
      fetchUsers();
    }
  }, [selectedBranch, fetchUsers, fetchStats, fetchPreviewToday]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: ChartPayloadItem[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          <p className="text-sm font-black mb-2 text-gray-900 dark:text-white">
            {label ? new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>
          <div className="space-y-1">
            {payload.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4">
                <span className="text-[10px] uppercase font-bold" style={{ color: item.color }}>{item.name}:</span>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Selamat datang, ${user?.nama}`}
      />

      {/* Selectors */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedUser('all');
                }}
                disabled={!isAdmin}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold appearance-none disabled:opacity-70 dark:text-gray-100 shadow-sm transition-all"
              >
                {isAdmin && <option value="all">Semua Cabang</option>}
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={isCS}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold appearance-none disabled:opacity-70 dark:text-gray-100 shadow-sm transition-all"
              >
                {!isCS && <option value="all">Semua Karyawan</option>}
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold dark:text-gray-100 shadow-sm cursor-pointer appearance-none transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold dark:text-gray-100 shadow-sm cursor-pointer appearance-none transition-all"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. Daily Targets & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Stats (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={TrendingUp}
              iconBgClass="bg-blue-50 dark:bg-blue-900/20"
              iconColorClass="text-blue-600 dark:text-blue-400"
              label="Omzet Hari Ini"
              value={formatCurrency(
                (selectedMonth === new Date().getMonth() + 1 &&
                  selectedYear === new Date().getFullYear() &&
                  previewToday?.total) || stats.todayOmzet
              )}
              staggerClass="stagger-1"
              extra={(fetchingStats || fetchingPreview) && <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />}
            />
            <StatCard
              icon={DollarSign}
              iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
              iconColorClass="text-emerald-600 dark:text-emerald-400"
              label="Komisi Hari Ini"
              value={formatCurrency(stats.todayCommission)}
              staggerClass="stagger-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Min Harian</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(stats.minTarget)}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Max Harian</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(stats.maxTarget)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Win Rate Analysis (4/12) */}
        <div className="lg:col-span-4 bg-gray-900 dark:bg-black rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-indigo-500/20 transition-all duration-700"></div>

          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-1">Analisa Pencapaian</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Statistik Win Rate Periode</p>

            <div className="mt-8 space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-300 tracking-tight">Hit Target Min</span>
                  <span className="text-xl font-black text-amber-400">{stats.winRateMin.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.winRateMin}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-gray-300 tracking-tight">Hit Target Max (Win)</span>
                  <span className="text-xl font-black text-indigo-400">{stats.winRateMax.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.winRateMax}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 relative z-10 p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Total Omzet Bulan Ini</p>
                <p className="text-md font-bold text-white">{formatCurrency(stats.monthlyOmzet)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Estimasi Komisi</p>
                <p className="text-md font-bold text-emerald-400">{formatCurrency(stats.totalCommission)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tren Omzet & Komisi</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Visualisasi harian untuk {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Omzet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Total Komisi</span>
            </div>
            {selectedBranch === 'all' && branches.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-800 pl-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getBranchColor(idx) }}></div>
                <span className="text-[9px] font-bold text-gray-400 uppercase">{b.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          {fetchingStats ? (
            <div className="w-full h-full flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : stats.chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400 italic font-medium">
              Tidak ada data untuk periode ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => new Date(val).getDate().toString()}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(val) => formatCurrency(val).replace('Rp ', '')}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(val) => formatCurrency(val).replace('Rp ', '')}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#10b981' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Dynamic Branch Lines */}
                {selectedBranch === 'all' && branches.map((b, idx) => (
                  <Line
                    key={b.id}
                    type="monotone"
                    yAxisId="left"
                    dataKey={`${b.id}_omzet`}
                    name={b.name}
                    stroke={getBranchColor(idx)}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}

                <Line
                  type="monotone"
                  yAxisId="left"
                  dataKey="total"
                  name="Total Omzet"
                  stroke="#4f46e5"
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  yAxisId="right"
                  dataKey="komisi"
                  name="Total Komisi"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-gray-400">
            {user?.nama?.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">{user?.nama}</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role} • @{user?.username}</p>
          </div>
        </div>
        <div className="flex gap-8 text-center sm:text-left">
          <div>
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Status Keamanan</p>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase">Aktif Terproteksi</span>
          </div>
          <div>
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Sesi Aktif</p>
            <span className="text-[10px] font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
