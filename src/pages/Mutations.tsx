import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import {
  ArrowUpRight, ArrowDownLeft, Plus, CheckCircle2, XCircle,
  Clock, History, ClipboardList, Filter, RefreshCw, Pencil, Trash2, Building2, User as UserIcon
} from 'lucide-react';

// payment method options (order: kas branches first, then transfers)
const METODE_OPTIONS = [
  { value: 'kas_utm', label: 'Kas Cabang UTM' },
  { value: 'kas_jtj', label: 'Kas Cabang JTJ' },
  { value: 'kas_tsm', label: 'Kas Cabang TSM' },
  { value: 'transfer_bca', label: 'Transfer BCA' },
  { value: 'transfer_bri', label: 'Transfer BRI' },
  { value: 'transfer_mandiri', label: 'Transfer Mandiri' },
  { value: 'transfer_bni', label: 'Transfer BNI' },
  { value: 'emoney', label: 'E-Money' },
];

// All columns used in the daily pivot table (in display order)
const ALL_KAS_COLS = [
  { value: 'kas_utm', label: 'Kas UTM' },
  { value: 'kas_jtj', label: 'Kas JTJ' },
  { value: 'kas_tsm', label: 'Kas TSM' },
  { value: 'transfer_bca', label: 'BCA' },
  { value: 'transfer_bri', label: 'BRI' },
  { value: 'transfer_mandiri', label: 'Mandiri' },
  { value: 'transfer_bni', label: 'BNI' },
  { value: 'emoney', label: 'eMoney' },
  { value: 'lainnya', label: 'Lainnya' },
];

interface Branch { id: string; name: string; }
interface UserProfile { id: string; nama: string; username: string; role: string; branch_id: string | null; }

interface WithdrawalRequest {
  id: string; user_id: string; user_nama: string; username: string;
  branch_id: string; branch_name: string; nominal: number; metode: string;
  keterangan: string | null; status: 'pending' | 'approved' | 'rejected';
  tanggal: string; catatan: string | null; created_at: string;
}

interface MutationRow {
  id: string; user_id: string; user_nama: string; branch_id: string; branch_name: string;
  tanggal: string; tipe: 'masuk' | 'keluar'; nominal: number; metode: string | null;
  saldo_setelah: number | null; keterangan: string; created_at: string; is_manual: number;
}

interface DailySummaryRow {
  tanggal: string; metode: string; total: number;
}

interface Balance {
  totalCommissions: number; totalKeluar: number; availableBalance: number;
  periodCommissions: number; periodKeluar: number;
}

// ── selector state ─────────────────────────────────────────────────────────────
interface Filters {
  branchId: string;   // '' = all
  userId: string;     // '' = all
  dateFrom: string;
  dateTo: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
};

export function Mutations() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHRD = user?.role === 'hrd';
  const isCS = user?.role === 'cs';
  const canManage = isAdmin || isHRD;

  // Data
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [mutations, setMutations] = useState<MutationRow[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummaryRow[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');

  // Filters
  const [filters, setFilters] = useState<Filters>({
    branchId: isHRD ? (user?.branch_id || '') : '',
    userId: isCS ? (user?.id || '') : '',
    dateFrom: firstOfMonth(),
    dateTo: todayStr(),
  });

  // Modals
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingMutation, setEditingMutation] = useState<MutationRow | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [approveAction, setApproveAction] = useState<boolean>(true);

  // Forms
  const [proposalForm, setProposalForm] = useState({ nominal: '', metode: 'transfer_bca', keterangan: '' });
  const [manualForm, setManualForm] = useState({ userId: '', nominal: '', metode: METODE_OPTIONS[0].value, keterangan: '', tipe: 'keluar', tanggal: todayStr() });
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── determine view mode ────────────────────────────────────────────────────
  const viewMode: 'daily-all' | 'daily-branch' | 'user-ledger' =
    filters.userId !== '' ? 'user-ledger' :
      (filters.branchId !== '') ? 'daily-branch' : 'daily-all';

  // ── fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      const q = params.toString() ? `?${params}` : '';

      const promises: Promise<any>[] = [
        api.get<WithdrawalRequest[]>(`/withdrawals/list${q}`),
        // Fetch balance only when a specific user is selected (or for CS: always their own)
        ...(filters.userId || isCS
          ? [api.get<Balance>(`/withdrawals/balance?${new URLSearchParams({ ...(filters.userId ? { userId: filters.userId } : {}), ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}), ...(filters.dateTo ? { dateTo: filters.dateTo } : {}) })}`)]
          : [Promise.resolve(null)]
        ),
      ];

      if (viewMode === 'user-ledger') {
        promises.push(api.get<MutationRow[]>(`/withdrawals/mutations${q}`));
      } else if (canManage) {
        promises.push(api.get<DailySummaryRow[]>(`/withdrawals/daily-summary${q}`));
      }

      const results = await Promise.all(promises);
      setRequests((results[0] as WithdrawalRequest[]) || []);
      setBalance(results[1] as Balance | null);
      if (viewMode === 'user-ledger') {
        setMutations((results[2] as MutationRow[]) || []);
        setDailySummary([]);
      } else if (canManage) {
        setDailySummary((results[2] as DailySummaryRow[]) || []);
        setMutations([]);
      }
    } catch (err: any) {
      setError('Gagal mengambil data. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode, canManage]);

  // Initial fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (canManage) {
          const br = await api.get<Branch[]>('/branches');
          setBranches(br || []);
        }
      } catch (_) { }
    };
    fetchBranches();
  }, [canManage]);

  // Fetch users when branch selection changes
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (canManage) {
          const url = filters.branchId
            ? `/auth/users?branchId=${filters.branchId}`
            : '/auth/users';
          const us = await api.get<UserProfile[]>(url);
          setUsers((us || []).filter((u: UserProfile) => u.role === 'cs'));
        }
      } catch (_) { }
    };
    fetchUsers();
  }, [canManage, filters.branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (k: keyof Filters, v: string) =>
    setFilters(prev => ({ ...prev, [k]: v, ...(k === 'branchId' ? { userId: '' } : {}) }));

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalForm.nominal || parseFloat(proposalForm.nominal) <= 0) return alert('Nominal harus lebih dari 0');
    setSubmitting(true);
    try {
      await api.post('/withdrawals/create', {
        nominal: parseFloat(proposalForm.nominal),
        metode: proposalForm.metode,
        keterangan: proposalForm.keterangan,
      });
      alert('Pengajuan berhasil dibuat!');
      setShowProposalModal(false);
      setProposalForm({ nominal: '', metode: 'transfer_bca', keterangan: '' });
      fetchData();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const openApprove = (req: WithdrawalRequest, action: boolean) => {
    setSelectedRequest(req); setApproveAction(action); setCatatan(''); setShowApproveModal(true);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      await api.post('/withdrawals/approve', { withdrawalId: selectedRequest.id, approved: approveAction, catatan });
      setShowApproveModal(false);
      fetchData();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMutation) {
        await api.put(`/withdrawals/manual/${editingMutation.id}`, {
          nominal: parseFloat(manualForm.nominal),
          metode: manualForm.metode,
          keterangan: manualForm.keterangan,
          tanggal: manualForm.tanggal,
        });
        alert('Mutasi diperbarui!');
      } else {
        await api.post('/withdrawals/manual', {
          userId: manualForm.userId || filters.userId,
          branchId: filters.branchId || branches[0]?.id,
          nominal: parseFloat(manualForm.nominal),
          metode: manualForm.metode,
          keterangan: manualForm.keterangan,
          tipe: manualForm.tipe,
          tanggal: manualForm.tanggal,
        });
        alert('Kas keluar berhasil dicatat!');
      }
      setShowManualModal(false); setEditingMutation(null);
      setManualForm({ userId: '', nominal: '', metode: METODE_OPTIONS[0].value, keterangan: '', tipe: 'keluar', tanggal: todayStr() });
      fetchData();
    } catch (err: any) { alert('Gagal: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteMutation = async (id: string) => {
    if (!confirm('Yakin ingin menghapus mutasi ini?')) return;
    try {
      await api.delete(`/withdrawals/manual/${id}`);
      fetchData();
    } catch (err: any) { alert('Gagal menghapus: ' + err.message); }
  };

  const openEditMutation = (mut: MutationRow) => {
    setEditingMutation(mut);
    setManualForm({
      userId: mut.user_id, nominal: String(mut.nominal), metode: mut.metode || METODE_OPTIONS[0].value,
      keterangan: mut.keterangan, tipe: mut.tipe, tanggal: mut.tanggal?.slice(0, 10) || todayStr(),
    });
    setShowManualModal(true);
  };

  const metodeLabel = (v: string | null) =>
    METODE_OPTIONS.find(m => m.value === v)?.label || v || '-';

  const statusBadge = (status: string) => {
    if (status === 'approved') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700';
    if (status === 'rejected') return 'bg-red-50 dark:bg-red-900/20 text-red-600';
    return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600';
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <PageHeader title="Mutasi Komisi" subtitle="Manajemen keuangan komisi CS per cabang" />
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canManage && (
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-xl text-sm font-bold transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Rekalkulasi
            </button>
          )}
          {canManage && viewMode === 'user-ledger' && (
            <button
              onClick={() => { setEditingMutation(null); setManualForm({ userId: filters.userId, nominal: '', metode: METODE_OPTIONS[0].value, keterangan: '', tipe: 'keluar', tanggal: todayStr() }); setShowManualModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Kas Keluar
            </button>
          )}
          {isCS && (
            <button
              onClick={() => setShowProposalModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> Tarik Komisi
            </button>
          )}
        </div>
      </div>

      {/* ── Balance Cards: only when specific user selected ─────────────── */}
      {(viewMode === 'user-ledger' || isCS) && balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Komisi Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Komisi Masuk</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">Periode</div>
                <div className="text-lg font-black text-emerald-600">{formatCurrency(balance.periodCommissions)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">Total Semua</div>
                <div className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(balance.totalCommissions)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-400 font-bold">Saldo Sisa (all-time)</div>
              <div className="text-base font-black text-blue-600">{formatCurrency(balance.availableBalance)}</div>
            </div>
          </div>
          {/* Keluar Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownLeft className="w-4 h-4 text-red-500" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Kas Keluar</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">Periode</div>
                <div className="text-lg font-black text-red-600">{formatCurrency(balance.periodKeluar)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">Total Semua</div>
                <div className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(balance.totalKeluar)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Alert: shown in all-user mode for Admin/HRD ─────────── */}
      {canManage && viewMode !== 'user-ledger' && (() => {
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        if (pendingCount === 0) return null;
        return (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 mb-6">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-black text-amber-700 dark:text-amber-400 text-sm">
                {pendingCount} pengajuan pencairan menunggu persetujuan
              </p>
              <p className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">Klik tab "Daftar Pengajuan" untuk memprosesnya.</p>
            </div>
          </div>
        );
      })()}

      {/* ── Selector Bar ─────────────────────────────────────────────────── */}
      {!isCS && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Filter Tampilan</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Cabang */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                <Building2 className="w-3 h-3 inline mr-1" />Cabang
              </label>
              <select
                value={filters.branchId}
                disabled={isHRD}
                onChange={e => setF('branchId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
              >
                <option value="">Semua Cabang</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {/* User */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                <UserIcon className="w-3 h-3 inline mr-1" />User CS
              </label>
              <select
                value={filters.userId}
                onChange={e => setF('userId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Semua User</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nama} ({u.username})</option>
                ))}
              </select>
            </div>
            {/* Date From */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dari</label>
              <input type="date" value={filters.dateFrom}
                onChange={e => setF('dateFrom', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            {/* Date To */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sampai</label>
              <input type="date" value={filters.dateTo}
                onChange={e => setF('dateTo', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          {/* View Mode indicator */}
          <div className="mt-3 text-[10px] font-bold text-gray-400 flex items-center gap-2">
            Mode:{' '}
            <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${viewMode === 'user-ledger' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
              : viewMode === 'daily-branch' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
              }`}>
              {viewMode === 'user-ledger' ? '👤 Ledger User' : viewMode === 'daily-branch' ? '🏢 Ringkasan Cabang' : '📊 Ringkasan Global'}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 text-red-600 p-4 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-800 w-fit rounded-xl">
        {(['requests', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab === 'requests' ? <><ClipboardList className="w-4 h-4" />Daftar Pengajuan</> : <><History className="w-4 h-4" />Riwayat Kas</>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : activeTab === 'requests' ? (
        /* ── REQUESTS TABLE ─────────────────────────────────────────────── */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Tanggal</th>
                  {canManage && <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">User</th>}
                  <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Cabang</th>
                  <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Nominal</th>
                  <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Metode</th>
                  <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                  {canManage && <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Tidak ada pengajuan penarikan.</td></tr>
                ) : requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium dark:text-white whitespace-nowrap">
                      {new Date(req.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-gray-900 dark:text-white text-xs">{req.user_nama || '—'}</div>
                        <div className="text-gray-400 text-[10px]">@{req.username}</div>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 text-xs">{req.branch_name}</td>
                    <td className="px-5 py-3.5 font-black text-gray-900 dark:text-white">{formatCurrency(req.nominal)}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{metodeLabel(req.metode)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusBadge(req.status)}`}>
                        {req.status === 'pending' && <Clock className="w-3 h-3 animate-pulse" />}
                        {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openApprove(req, true)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all" title="Approve">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openApprove(req, false)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : <span className="text-gray-400 text-[10px] italic">Sudah diproses</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── HISTORY TAB ─────────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Mode: USER LEDGER */}
          {viewMode === 'user-ledger' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Tanggal</th>
                      {canManage && <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">User</th>}
                      <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Tipe</th>
                      <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Nominal</th>
                      <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Metode</th>
                      <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider">Keterangan</th>
                      {canManage && <th className="px-5 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {mutations.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Belum ada riwayat kas untuk periode ini.</td></tr>
                    ) : mutations.map(mut => (
                      <tr key={mut.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">{new Date(mut.created_at).toLocaleDateString('id-ID')}</td>
                        {canManage && (
                          <td className="px-5 py-3.5 text-xs">
                            <div className="font-bold dark:text-white">{mut.user_nama || '—'}</div>
                            <div className="text-gray-400">{mut.branch_name}</div>
                          </td>
                        )}
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${mut.tipe === 'masuk' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600' : 'bg-red-50 dark:bg-red-900/10 text-red-600'
                            }`}>
                            {mut.tipe === 'masuk' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {mut.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 font-black ${mut.tipe === 'masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {mut.tipe === 'masuk' ? '+' : '-'}{formatCurrency(mut.nominal)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 italic max-w-[180px] truncate">{mut.keterangan}</td>
                        {canManage && (
                          <td className="px-5 py-3.5 text-right">
                            {mut.is_manual === 1 && (
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openEditMutation(mut)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Edit">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteMutation(mut.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Hapus">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mode: DAILY SUMMARY PIVOT (all users or by branch) */}
          {(viewMode === 'daily-all' || viewMode === 'daily-branch') && canManage && (() => {
            const branchName = branches.find(b => b.id === filters.branchId)?.name || '';

            // Columns to display based on mode
            const visibleCols = viewMode === 'daily-branch'
              ? ALL_KAS_COLS.filter(c => c.value === `kas_${filters.branchId.toLowerCase()}`)
              : ALL_KAS_COLS;

            // Pivot: group by tanggal → map metode → total
            const byDate = new Map<string, Record<string, number>>();
            for (const row of dailySummary) {
              if (!byDate.has(row.tanggal)) byDate.set(row.tanggal, {});
              const val = Number(row.total || 0);
              byDate.get(row.tanggal)![row.metode] = (byDate.get(row.tanggal)![row.metode] || 0) + val;
            }
            // sort by date desc
            const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

            // column totals
            const colTotals: Record<string, number> = {};
            for (const col of visibleCols) {
              colTotals[col.value] = dates.reduce((s, d) => s + (byDate.get(d)?.[col.value] || 0), 0);
            }
            const grandTotal = visibleCols.reduce((s, c) => s + (colTotals[c.value] || 0), 0);

            return (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-gray-700 dark:text-white text-sm">
                      {viewMode === 'daily-all' ? '📊 Rekap Kas Harian — Semua Metode' : `🏢 Rekap Kas Harian — Kas ${branchName}`}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Kas keluar per tanggal, dipisah per metode pembayaran</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                    {dates.length} hari
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                        {visibleCols.map(col => (
                          <th key={col.value} className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                            {col.label}
                          </th>
                        ))}
                        <th className="px-5 py-3 text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider text-right whitespace-nowrap border-l border-gray-200 dark:border-gray-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {dates.length === 0 ? (
                        <tr><td colSpan={visibleCols.length + 2} className="py-16 text-center text-gray-400 text-sm">Tidak ada data untuk periode ini.</td></tr>
                      ) : dates.map(tanggal => {
                        const vals = byDate.get(tanggal)!;
                        const rowTotal = visibleCols.reduce((s, c) => s + (vals[c.value] || 0), 0);
                        return (
                          <tr key={tanggal} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap text-xs">
                              {new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            {visibleCols.map(col => (
                              <td key={col.value} className="px-4 py-3 text-right text-xs">
                                {vals[col.value] ? (
                                  <span className="font-bold text-red-600">{formatCurrency(vals[col.value])}</span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-700">—</span>
                                )}
                              </td>
                            ))}
                            <td className="px-5 py-3 text-right font-black text-gray-900 dark:text-white text-sm border-l border-gray-200 dark:border-gray-700">
                              {rowTotal > 0 ? formatCurrency(rowTotal) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {dates.length > 0 && (
                      <tfoot className="bg-amber-50 dark:bg-amber-900/10 border-t-2 border-amber-200 dark:border-amber-800">
                        <tr>
                          <td className="px-5 py-3.5 font-black text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider whitespace-nowrap">
                            Total Periode
                          </td>
                          {visibleCols.map(col => (
                            <td key={col.value} className="px-4 py-3.5 text-right font-black text-red-700 dark:text-red-400 text-sm">
                              {colTotals[col.value] > 0 ? formatCurrency(colTotals[col.value]) : <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                          <td className="px-5 py-3.5 text-right font-black text-gray-900 dark:text-white text-sm border-l border-amber-200 dark:border-amber-800">
                            {formatCurrency(grandTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MODAL: CS Proposal ────────────────────────────────────────────── */}
      <Modal isOpen={showProposalModal} onClose={() => setShowProposalModal(false)} title="Pengajuan Penarikan Komisi"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowProposalModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Batal</button>
            <button form="proposal-form" type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
              {submitting ? 'Memproses...' : 'Kirim Pengajuan'}
            </button>
          </div>
        }
      >
        <form id="proposal-form" onSubmit={handleProposal} className="space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Saldo Tersedia</div>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(balance?.availableBalance || 0)}</div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nominal Penarikan</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">Rp</span>
              <input type="number" required value={proposalForm.nominal}
                onChange={e => setProposalForm(f => ({ ...f, nominal: e.target.value }))}
                className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-black dark:text-white"
                placeholder="0" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Metode Pembayaran</label>
            <select value={proposalForm.metode} onChange={e => setProposalForm(f => ({ ...f, metode: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm font-medium">
              {METODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Keterangan</label>
            <textarea value={proposalForm.keterangan} onChange={e => setProposalForm(f => ({ ...f, keterangan: e.target.value }))}
              rows={2} placeholder="No. rekening, nama pemilik, dll."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm resize-none" />
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Approve/Reject ─────────────────────────────────────────── */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)}
        title={approveAction ? '✅ Setujui Penarikan' : '❌ Tolak Penarikan'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowApproveModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Batal</button>
            <button form="approve-form" type="submit" disabled={submitting}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${approveAction ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {submitting ? 'Memproses...' : (approveAction ? 'Setujui & Proses Kas' : 'Tolak Pengajuan')}
            </button>
          </div>
        }
      >
        <form id="approve-form" onSubmit={handleApprove} className="space-y-4">
          {selectedRequest && (
            <div className={`p-4 rounded-2xl border ${approveAction ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' : 'bg-red-50 dark:bg-red-900/10 border-red-100'}`}>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">User:</span> <span className="font-bold dark:text-white">{selectedRequest.user_nama}</span></div>
                <div><span className="text-gray-400">Nominal:</span> <span className="font-black text-gray-900 dark:text-white">{formatCurrency(selectedRequest.nominal)}</span></div>
                <div><span className="text-gray-400">Metode:</span> <span className="font-bold">{metodeLabel(selectedRequest.metode)}</span></div>
                <div><span className="text-gray-400">Cabang:</span> <span className="font-bold">{selectedRequest.branch_name}</span></div>
              </div>
              {selectedRequest.keterangan && (
                <p className="text-xs text-gray-500 italic mt-2">{selectedRequest.keterangan}</p>
              )}
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Catatan (opsional)</label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} placeholder="Catatan approval..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm resize-none" />
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Manual Kas Keluar (Admin/HRD) ─────────────────────────── */}
      <Modal isOpen={showManualModal} onClose={() => { setShowManualModal(false); setEditingMutation(null); }}
        title={editingMutation ? '✏️ Edit Mutasi' : '💸 Tambah Kas Keluar Manual'}
        footer={
          <div className="flex gap-3">
            <button onClick={() => { setShowManualModal(false); setEditingMutation(null); }}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Batal</button>
            <button form="manual-form" type="submit" disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
              {submitting ? 'Menyimpan...' : (editingMutation ? 'Simpan Perubahan' : 'Catat Kas Keluar')}
            </button>
          </div>
        }
      >
        <form id="manual-form" onSubmit={handleManualSave} className="space-y-4">
          {!editingMutation && (
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">User CS</label>
              <select value={manualForm.userId} onChange={e => setManualForm(f => ({ ...f, userId: e.target.value }))} required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none dark:text-white text-sm">
                <option value="">-- Pilih User --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.username})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Tanggal</label>
            <input type="date" value={manualForm.tanggal} onChange={e => setManualForm(f => ({ ...f, tanggal: e.target.value }))} required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none dark:text-white text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nominal</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">Rp</span>
              <input type="number" required value={manualForm.nominal} onChange={e => setManualForm(f => ({ ...f, nominal: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-lg font-black dark:text-white"
                placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Metode Pembayaran</label>
            <select value={manualForm.metode} onChange={e => setManualForm(f => ({ ...f, metode: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none dark:text-white text-sm font-medium">
              {METODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Keterangan</label>
            <textarea value={manualForm.keterangan} onChange={e => setManualForm(f => ({ ...f, keterangan: e.target.value }))} rows={2}
              placeholder="Deskripsi transaksi..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none dark:text-white text-sm resize-none" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
