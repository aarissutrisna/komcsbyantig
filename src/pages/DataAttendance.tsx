import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { RefreshCw, Search, Filter, Database, Calendar } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface OmzetRecord {
  id: string;
  branch_id: string;
  amount: number;
  date: string;
  description: string;
}

export function DataAttendance() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [omzetData, setOmzetData] = useState<OmzetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchOmzet();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const data = await api.get<Branch[]>('/branches');
      setBranches(data || []);
      if (data && data.length > 0) {
        setSelectedBranch(user?.branch_id || data[0].id);
      }
    } catch (err) {
      setError('Gagal mengambil data cabang');
    } finally {
      if (branches.length === 0) setLoading(false);
    }
  };

  const fetchOmzet = async () => {
    setLoading(true);
    try {
      const data = await api.get<OmzetRecord[]>(`/omzet/by-branch?branchId=${selectedBranch}`);
      setOmzetData(data || []);
    } catch (err) {
      setError('Gagal mengambil data omzet');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedBranch) return;
    setSyncing(true);
    try {
      await api.post('/omzet/sync/n8n', { branchId: selectedBranch });
      await fetchOmzet();
      alert('Sinkronisasi data omzet berhasil!');
    } catch (err: any) {
      alert('Sinkronisasi gagal: ' + (err.message || 'Cek koneksi n8n'));
    } finally {
      setSyncing(false);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Data Kehadiran & Omzet"
        subtitle="Kelola data performa cabang setiap harinya"
      />

      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="pl-10 pr-6 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
              disabled={user?.role === 'cs'}
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 7.293 8.122 5.879 9.539z" /></svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {(user?.role === 'admin' || user?.role === 'hrd') && (
            <button
              onClick={handleSync}
              disabled={syncing || !selectedBranch}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sinkronisasi...' : 'Sync n8n'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Omzet</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : omzetData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Database className="w-12 h-12 opacity-20" />
                      <p className="text-sm">Tidak ada data omzet ditemukan untuk periode ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                omzetData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(record.date).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(record.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                        {record.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Search className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
