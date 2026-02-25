import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/currency';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import {
  RefreshCw,
  Search,
  Filter,
  Database,
  AlertTriangle,
  Save
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface PreviewData {
  branchId: string;
  tanggal: string;
  cash: number;
  piutang: number;
  total: number;
}

interface ComparisonData {
  oldData: { cash: number; piutang: number; total: number; description: string } | null;
  newData: { cash: number; piutang: number; total: number; description: string } | null;
  canUpdate: boolean;
}

interface User {
  id: string;
  username: string;
  nama: string;
  branch_id: string;
  role: string;
}

interface OmzetRecord {
  id: string;
  user_id: string;
  username?: string;
  nama?: string;
  branch_id: string;
  branch_name?: string;
  cash: number;
  bayar_piutang: number;
  total: number;
  date: string;
  description: string;
  kehadiran: number;
  komisi: number;
  min_omzet: number;
  max_omzet: number;
  is_final?: boolean;
}

export function DataAttendance() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [omzetData, setOmzetData] = useState<OmzetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Periode States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Target States
  const [monthlyTarget, setMonthlyTarget] = useState<{ min_omzet: number; max_omzet: number; is_default?: boolean } | null>(null);
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [showTargetWarning, setShowTargetWarning] = useState(false);

  // Sync/Preview States
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [comparisonDate, setComparisonDate] = useState('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [fetchingComparison, setFetchingComparison] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchUsers();
      fetchOmzet();
      fetchMonthlyTarget();
    }
  }, [selectedBranch, selectedMonth, selectedYear, selectedUser]);

  const fetchInitialData = async () => {
    try {
      let bData: Branch[];
      if (user?.role === 'cs') {
        // CS: only see branches they've ever been assigned to
        bData = await api.get<Branch[]>('/penugasan/my-branches');

        // Ensure home branch is included
        if (user.branch_id && !bData.find(b => b.id === user.branch_id)) {
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
      // - Admin: first branch
      let initialBranch = '';
      if (user?.role === 'cs') {
        initialBranch = (bData && bData.length > 0 ? bData[0].id : '') || user.branch_id || '';
        setSelectedUser(user.id);
      } else if (user?.role === 'hrd') {
        initialBranch = user.branch_id || (bData && bData.length > 0 ? bData[0].id : '');
      } else {
        initialBranch = bData && bData.length > 0 ? bData[0].id : '';
      }

      if (initialBranch) setSelectedBranch(initialBranch);
    } catch (err) {
      setError('Gagal mengambil data awal');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>(`/auth/users?branchId=${selectedBranch}`);
      setUsers(data.filter(u => u.role === 'cs') || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchOmzet = async () => {
    setLoading(true);
    try {
      const endpoint = `/omzet/by-branch?branchId=${selectedBranch}&month=${selectedMonth}&year=${selectedYear}&userId=${selectedUser}`;
      const data = await api.get<OmzetRecord[]>(endpoint);
      setOmzetData(data || []);
    } catch (err) {
      setError('Gagal mengambil data omzet');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTarget = async () => {
    if (!selectedBranch || selectedBranch === 'all') return;
    try {
      const data = await api.get<{ min_omzet: number; max_omzet: number; is_default?: boolean }>(
        `/targets?branchId=${selectedBranch}&month=${selectedMonth}&year=${selectedYear}`
      );
      setMonthlyTarget(data);
      setEditMin(formatNumber(data.min_omzet));
      setEditMax(formatNumber(data.max_omzet));
    } catch (err) {
      console.error('Failed to fetch monthly target:', err);
    }
  };

  const handleSaveTarget = async () => {
    if (user?.role !== 'admin') return;
    setIsSavingTarget(true);
    try {
      await api.post('/targets/save', {
        branchId: selectedBranch,
        month: selectedMonth,
        year: selectedYear,
        min_omzet: parseFloat(editMin.replace(/\./g, '')),
        max_omzet: parseFloat(editMax.replace(/\./g, ''))
      });
      alert('Target berhasil disimpan dan komisi dihitung ulang!');
      setShowTargetWarning(false);
      fetchMonthlyTarget();
      fetchOmzet();
    } catch (err: any) {
      alert('Gagal menyimpan target: ' + err.message);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleUpdateKehadiran = async (recordId: string, value: number) => {
    try {
      if (selectedUser === 'all') throw new Error('Pilih karyawan spesifik terlebih dahulu');
      await api.post('/omzet/update-kehadiran', { id: recordId, kehadiran: value, userId: selectedUser });
      fetchOmzet();
    } catch (err: any) {
      alert('Gagal update kehadiran: ' + err.message);
    }
  };

  const handleTargetInput = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\D/g, '');
    if (clean === '') {
      setter('');
      return;
    }
    const num = parseInt(clean);
    setter(formatNumber(num));
  };

  const handlePreviewToday = async () => {
    if (!selectedBranch || selectedBranch === 'all') return;
    setFetchingPreview(true);
    try {
      const data = await api.get<PreviewData>(`/omzet/preview-today?branchId=${selectedBranch}`);
      setPreviewData(data);
    } catch (err: any) {
      alert('Gagal mengambil preview: ' + err.message);
    } finally {
      setFetchingPreview(false);
    }
  };

  const fetchComparison = async () => {
    if (!selectedBranch || !comparisonDate) return;
    setFetchingComparison(true);
    try {
      const data = await api.get<ComparisonData>(`/omzet/update-comparison?branchId=${selectedBranch}&tanggal=${comparisonDate}`);
      setComparison(data);
    } catch (err: any) {
      alert('Gagal mengambil perbandingan: ' + err.message);
    } finally {
      setFetchingComparison(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBranch || !comparisonDate) return;
    setUpdating(true);
    try {
      await api.post('/omzet/update-controlled', { branchId: selectedBranch, tanggal: comparisonDate });
      alert('Update data berhasil dan komisi dihitung ulang!');
      setShowUpdateModal(false);
      setComparison(null);
      fetchOmzet();
    } catch (err: any) {
      alert('Update gagal: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Role visibility helpers
  const isAdmin = user?.role === 'admin';
  const isHRD = user?.role === 'hrd';
  const isCS = user?.role === 'cs';

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Data Kehadiran & Komisi"
        subtitle="Monitoring omzet, target bulanan, dan kehadiran"
        actions={
          <button
            onClick={() => setShowUpdateModal(true)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10 active:scale-95 text-sm"
          >
            <Save className="w-4 h-4" />
            Input/Sync Data
          </button>
        }
      />

      {/* 1. Dashboard Controls & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* N8N Live Data (70%) - Vertical 3 Segments */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Segment 1: Header & Refresh */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${fetchingPreview ? 'bg-indigo-50 animate-pulse' : 'bg-green-50 dark:bg-green-900/10'}`}>
                <Database className={`w-4 h-4 ${fetchingPreview ? 'text-indigo-400' : 'text-green-500'}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Live Monitor (N8N)</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</p>
              </div>
            </div>
            <button
              onClick={handlePreviewToday}
              disabled={fetchingPreview}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-600 rounded-xl transition-all border border-gray-100 dark:border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingPreview ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Segment 2a: Cash */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <span className="text-[9px] text-gray-400 font-black uppercase block mb-1">Cash</span>
              <span className="text-md font-black text-gray-900 dark:text-white">{previewData ? formatCurrency(previewData.cash) : 'Rp ---'}</span>
            </div>
            {/* Segment 2b: Piutang */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <span className="text-[9px] text-gray-400 font-black uppercase block mb-1">Piutang</span>
              <span className="text-md font-black text-gray-900 dark:text-white">{previewData ? formatCurrency(previewData.piutang) : 'Rp ---'}</span>
            </div>
          </div>

          {/* Segment 3: Total Omzet */}
          <div className="bg-blue-600 dark:bg-indigo-700 rounded-2xl p-5 shadow-lg shadow-blue-500/20 flex items-center justify-between overflow-hidden relative group">
            <div className="relative z-10">
              <span className="text-[9px] text-blue-100/70 font-black uppercase tracking-widest block mb-1">Total Omzet Hari Ini</span>
              <span className="text-2xl font-black text-white">{previewData ? formatCurrency(previewData.total) : 'Rp ---'}</span>
            </div>
            <Database className="absolute -right-6 -bottom-6 w-24 h-24 text-white/10 opacity-20 pointer-events-none rotate-12" />
          </div>
        </div>

        {/* Vertical Target Panel (30%) - 4 Rows */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Target Bulanan</p>
              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })} {selectedYear}
              </h4>
            </div>
            {monthlyTarget?.is_default && (
              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[8px] font-black uppercase">Default</span>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-start bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 gap-3">
              <label className="text-[10px] text-gray-400 font-black uppercase">Min</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 font-bold mr-1">Rp</span>
                <input
                  type="text"
                  value={editMin}
                  onChange={(e) => handleTargetInput(e.target.value, setEditMin)}
                  readOnly={!isAdmin}
                  className="w-32 text-sm font-black text-blue-600 bg-transparent text-left outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-start bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 gap-3">
              <label className="text-[10px] text-gray-400 font-black uppercase">Max</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 font-bold mr-1">Rp</span>
                <input
                  type="text"
                  value={editMax}
                  onChange={(e) => handleTargetInput(e.target.value, setEditMax)}
                  readOnly={!isAdmin}
                  className="w-32 text-sm font-black text-indigo-600 bg-transparent text-left outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowTargetWarning(true)}
              disabled={isSavingTarget}
              className="w-full py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-black dark:hover:bg-gray-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
            >
              {isSavingTarget ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update Target
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main Data & Table Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Integrated Filters in Table Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white leading-tight">
                  {selectedUser === 'all' ? 'Laporan Akumulasi Cabang' : 'Laporan Kehadiran CS'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Data Record Per Tanggal</p>
              </div>
            </div>
            {selectedUser === 'all' && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">AGREGASI AKTIF</span>
            )}
          </div>

          {/* Table Filters Row */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200/50">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedUser('all');
                  }}
                  disabled={!isAdmin}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold appearance-none disabled:bg-gray-50 disabled:text-gray-500 shadow-sm"
                >
                  {isAdmin && <option value="all">Semua Cabang</option>}
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={isCS}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold appearance-none disabled:bg-gray-50 disabled:text-gray-500 shadow-sm"
                >
                  {!isCS && <option value="all">Semua Karyawan</option>}
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold shadow-sm cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold shadow-sm cursor-pointer"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">NO</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Cash</th>
                <th className="px-6 py-4">Bayar Piutang</th>
                <th className="px-6 py-4 text-center">Total</th>
                {selectedUser !== 'all' && <th className="px-6 py-4 text-center">Kehadiran</th>}
                <th className="px-6 py-4 text-right">Komisi</th>
                {(isAdmin || isHRD) && selectedUser !== 'all' && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center"><LoadingSpinner size="md" /></td></tr>
              ) : omzetData.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">Belum ada data untuk periode ini.</td></tr>
              ) : (
                omzetData.map((record, index) => (
                  <tr key={record.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all">
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                          {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{new Date(record.date).toLocaleDateString('id-ID', { year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{formatCurrency(record.cash)}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{formatCurrency(record.bayar_piutang)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(record.total)}</span>
                    </td>
                    {selectedUser !== 'all' && (
                      <td className="px-6 py-4 text-center">
                        <select
                          value={Number(record.kehadiran)}
                          onChange={(e) => handleUpdateKehadiran(record.id, parseFloat(e.target.value))}
                          disabled={isCS}
                          className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border transition-all ${Number(record.kehadiran) === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                            Number(record.kehadiran) === 0.5 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            } disabled:opacity-100 appearance-none text-center cursor-pointer`}
                        >
                          <option value={1}>1</option>
                          <option value={0.5}>0.5</option>
                          <option value={0}>0</option>
                        </select>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-black text-green-600 dark:text-green-500">{formatCurrency(record.komisi)}</span>
                        {record.branch_name && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                            {record.branch_name}
                          </span>
                        )}
                      </div>
                    </td>
                    {(isAdmin || isHRD) && selectedUser !== 'all' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleUpdateKehadiran(record.id, record.kehadiran)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync/Update Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Sync Data dari Program Penjualan"
        footer={
          comparison?.newData && (
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              {updating ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
              SYNC & OVERWRITE DATA
            </button>
          )
        }
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-500">Pilih Tanggal Untuk Di-update</label>
            <div className="flex gap-4">
              <input
                type="date"
                value={comparisonDate}
                onChange={(e) => setComparisonDate(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:ring-2 focus:ring-blue-500 rounded-xl outline-none shadow-inner font-mono text-gray-900 dark:text-white"
              />
              <button
                onClick={fetchComparison}
                disabled={fetchingComparison || !comparisonDate}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:bg-gray-300 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
              >
                {fetchingComparison ? <RefreshCw className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                Cek N8N
              </button>
            </div>
          </div>

          {comparison && (
            <div className="animate-fade-in-up space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase text-gray-400">
                      <th className="px-6 py-3">Sumber Data</th>
                      <th className="px-6 py-3">Cash</th>
                      <th className="px-6 py-3">Bayar Piutang</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="bg-white dark:bg-gray-900/50 text-gray-500">
                      <td className="px-6 py-4 font-bold">Lama (Webapp)</td>
                      <td className="px-6 py-4">{comparison.oldData ? formatCurrency(comparison.oldData.cash) : '-'}</td>
                      <td className="px-6 py-4">{comparison.oldData ? formatCurrency(comparison.oldData.piutang) : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold">{comparison.oldData ? formatCurrency(comparison.oldData.total) : '-'}</td>
                    </tr>
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 text-blue-700">
                      <td className="px-6 py-4 font-bold flex items-center gap-2">
                        Baru (N8N)
                        <span className="px-1.5 py-0.5 bg-blue-100 text-[9px] rounded uppercase font-black">LATEST</span>
                      </td>
                      <td className="px-6 py-4">{comparison.newData ? formatCurrency(comparison.newData.cash) : '-'}</td>
                      <td className="px-6 py-4">{comparison.newData ? formatCurrency(comparison.newData.piutang) : '-'}</td>
                      <td className="px-6 py-4 text-right font-black text-lg">{comparison.newData ? formatCurrency(comparison.newData.total) : '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {comparison.newData && (
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-[11px] text-orange-800 flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-500" />
                  <p>Mengklik <b>Sync & Overwrite</b> akan memperbarui omzet untuk <b>SEMUA USER</b> di cabang ini pada tanggal tersebut. Seluruh komisi tanggal tersebut akan dihitung ulang secara otomatis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Target Warning Modal */}
      <Modal
        isOpen={showTargetWarning}
        onClose={() => setShowTargetWarning(false)}
        title="Warning: Rekalkulasi Bulanan"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowTargetWarning(false)}
              className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleSaveTarget}
              disabled={isSavingTarget}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSavingTarget ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lanjutkan Simpan'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-red-50 rounded-full mb-4 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Perubahan target akan menghapus dan menghitung ulang seluruh komisi CS pada <span className="font-bold underline text-gray-900">bulan {new Date(0, selectedMonth - 1).toLocaleString('id-ID', { month: 'long' })}</span> ini.
            <span className="block mt-2 font-bold text-red-600 italic">Hal ini dapat menyebabkan saldo user berubah drastis atau negatif.</span>
          </p>
        </div>
      </Modal>
    </div>
  );
}
