import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Building, User as UserIcon, Plus, Database, ClipboardList, Trash2, BarChart2, History, ChevronDown } from 'lucide-react';

interface User {
    id: string;
    nama: string;
    username: string;
    role: string;
    branch_id: string | null;
}

interface Branch {
    id: string;
    name: string;
}

interface PenugasanRecord {
    id: string;
    user_id: string;
    user_nama: string;
    username: string;
    cabang_id: string;
    cabang_name: string;
    tanggal_mulai: string;
    faktor_komisi: string;
    created_at: string;
}

interface RekapItem {
    user_id: string;
    user_nama: string;
    username: string;
    cabang_id: string;
    cabang_name: string;
    tanggal_mulai: string;
    faktor_komisi: string;
}

interface HistoriItem {
    tanggal_mulai: string;
    cabang_id: string;
    cabang_name: string;
    pembagian: string;
}

export function Penugasan() {
    const [records, setRecords] = useState<PenugasanRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        userId: '',
        cabangId: '',
        tanggalMulai: '',
        faktorKomisi: '',
    });

    // Rekap & Histori Modal
    const [showRekapModal, setShowRekapModal] = useState(false);
    const [rekapTab, setRekapTab] = useState<'rekap' | 'histori'>('rekap');
    const [rekapData, setRekapData] = useState<RekapItem[]>([]);
    const [historiData, setHistoriData] = useState<HistoriItem[]>([]);
    const [rekapBranch, setRekapBranch] = useState(''); // active tab in rekap view
    const [histBranch, setHistBranch] = useState('');   // selected branch in histori
    const [rekapLoading, setRekapLoading] = useState(false);
    const [histLoading, setHistLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            let userList: User[] = [];
            try {
                userList = await api.get<User[]>('/auth/users');
            } catch (err) {
                try {
                    userList = await api.get<User[]>('/users');
                } catch (_) { }
            }

            if (userList && Array.isArray(userList)) {
                setUsers(userList.filter((u) => u.role?.toLowerCase() === 'cs'));
            }

            const [recs, brc] = await Promise.all([
                api.get<PenugasanRecord[]>('/penugasan').catch(e => { console.error(e); return []; }),
                api.get<Branch[]>('/branches').catch(e => { console.error(e); return []; }),
            ]);

            setRecords(recs);
            setBranches(brc);
            if (brc.length > 0) {
                setRekapBranch(brc[0].id);
                setHistBranch(brc[0].id);
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError('Gagal memuat data. Pastikan tabel cs_penugasan sudah dibuat (node run_migration.js).');
        } finally {
            setLoading(false);
        }
    };

    const openRekapModal = async () => {
        setShowRekapModal(true);
        setRekapTab('rekap');
        await fetchRekap();
    };

    const fetchRekap = async () => {
        setRekapLoading(true);
        try {
            const data = await api.get<RekapItem[]>('/penugasan/rekap');
            setRekapData(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setRekapLoading(false);
        }
    };

    const fetchHistori = async (cabangId: string) => {
        if (!cabangId) return;
        setHistLoading(true);
        try {
            const data = await api.get<HistoriItem[]>(`/penugasan/histori?cabangId=${cabangId}`);
            setHistoriData(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setHistLoading(false);
        }
    };

    const handleRekapTabChange = (tab: 'rekap' | 'histori') => {
        setRekapTab(tab);
        if (tab === 'histori' && histBranch) {
            fetchHistori(histBranch);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus penugasan ini?')) return;
        try {
            await api.delete(`/penugasan/${id}`);
            fetchAll();
        } catch (err: any) {
            alert(err.message || 'Gagal menghapus penugasan');
        }
    };

    const openModal = () => {
        setFormData({ userId: '', cabangId: '', tanggalMulai: '', faktorKomisi: '' });
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.userId) return setError('User wajib dipilih');
        if (!formData.cabangId) return setError('Cabang wajib dipilih');
        if (!formData.tanggalMulai) return setError('Tanggal mulai wajib diisi');
        if (!formData.faktorKomisi) return setError('Faktor komisi wajib diisi');

        const faktor = parseFloat(formData.faktorKomisi);
        if (isNaN(faktor) || faktor <= 0) return setError('Faktor komisi harus lebih dari 0');
        if (faktor > 1) return setError('Faktor komisi tidak boleh lebih dari 1');

        setSaving(true);
        try {
            await api.post('/penugasan', {
                userId: formData.userId,
                cabangId: formData.cabangId,
                tanggalMulai: formData.tanggalMulai,
                faktorKomisi: faktor,
            });
            setIsModalOpen(false);
            fetchAll();
        } catch (err: any) {
            setError(err.message || 'Gagal menyimpan penugasan');
        } finally {
            setSaving(false);
        }
    };

    // Group rekap by cabang
    const rekapByCabang: Record<string, RekapItem[]> = {};
    for (const item of rekapData) {
        if (!rekapByCabang[item.cabang_id]) rekapByCabang[item.cabang_id] = [];
        rekapByCabang[item.cabang_id].push(item);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <PageHeader
                    title="Penugasan CS"
                    subtitle="Kelola penugasan CS ke cabang beserta faktor komisi (total per cabang maks. 100%)"
                />
                <div className="flex items-center gap-2">
                    <button
                        onClick={openRekapModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold transition-all active:scale-95 text-sm"
                    >
                        <BarChart2 className="w-4 h-4" />
                        Rekap &amp; Histori
                    </button>
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Tambah Penugasan
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User CS</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cabang</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Berlaku Mulai</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Faktor Komisi</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dibuat</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                                        <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        <p className="font-medium">Belum ada data penugasan.</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase text-sm">
                                                    {r.user_nama?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{r.user_nama}</div>
                                                    <div className="text-xs text-gray-400">@{r.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{r.cabang_name}</span>
                                                <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.cabang_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                {new Date(r.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-black bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                                {(parseFloat(r.faktor_komisi) * 100).toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-400">
                                                {new Date(r.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Hapus Penugasan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Modal: Rekap & Histori ─────────────────────────────────────────── */}
            <Modal
                isOpen={showRekapModal}
                onClose={() => setShowRekapModal(false)}
                title="📋 Rekap & Histori Penugasan"
            >
                {/* Inner tabs */}
                <div className="flex items-center gap-1 mb-5 p-1 bg-gray-100 dark:bg-gray-800 w-fit rounded-xl">
                    {(['rekap', 'histori'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleRekapTabChange(tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${rekapTab === tab
                                ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab === 'rekap'
                                ? <><BarChart2 className="w-3.5 h-3.5" /> Rekap Terakhir</>
                                : <><History className="w-3.5 h-3.5" /> Histori Penugasan</>
                            }
                        </button>
                    ))}
                </div>

                {/* ── TAB: REKAP TERAKHIR ───────────────────────────────────────── */}
                {rekapTab === 'rekap' && (
                    <div>
                        {/* Branch tabs */}
                        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
                            {branches.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => setRekapBranch(b.id)}
                                    className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${rekapBranch === b.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>

                        {rekapLoading ? (
                            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                        ) : (
                            <div className="space-y-2">
                                {(() => {
                                    const items = rekapByCabang[rekapBranch] || [];
                                    if (items.length === 0) return (
                                        <p className="text-center text-gray-400 py-8 text-sm">Belum ada penugasan aktif untuk cabang ini.</p>
                                    );
                                    const branchName = branches.find(b => b.id === rekapBranch)?.name || rekapBranch;
                                    return (
                                        <>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Building className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-black text-gray-700 dark:text-white">Cabang {branchName}</span>
                                                <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    Total: {items.reduce((s, i) => s + parseFloat(i.faktor_komisi), 0) * 100 | 0}%
                                                </span>
                                            </div>
                                            {items.map((item) => (
                                                <div key={item.user_id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase text-xs">
                                                            {item.user_nama?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{item.user_nama}</div>
                                                            <div className="text-[10px] text-gray-400">
                                                                Mulai {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-black bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                                        {(parseFloat(item.faktor_komisi) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: HISTORI PENUGASAN ─────────────────────────────────────── */}
                {rekapTab === 'histori' && (
                    <div>
                        {/* Branch selector */}
                        <div className="relative mb-4">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={histBranch}
                                onChange={(e) => {
                                    setHistBranch(e.target.value);
                                    fetchHistori(e.target.value);
                                }}
                                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none text-sm font-bold"
                            >
                                <option value="">-- Pilih Cabang --</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {histLoading ? (
                            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                        ) : historiData.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 text-sm">
                                {histBranch ? 'Belum ada histori penugasan untuk cabang ini.' : 'Pilih cabang untuk melihat histori.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-800">
                                            <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider w-10">No</th>
                                            <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Tgl Mulai</th>
                                            <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Pembagian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {historiData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="px-4 py-3 text-xs font-bold text-gray-400">{String(idx + 1).padStart(2, '0')}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                                                    {item.pembagian}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal: Tambah Penugasan */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Tambah Penugasan CS"
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            form="penugasan-form"
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-60"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Penugasan'}
                        </button>
                    </div>
                }
            >
                <form id="penugasan-form" onSubmit={handleSave} className="space-y-4" noValidate>
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">User CS</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="">-- Pilih User CS --</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{u.nama} (@{u.username})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cabang Tujuan</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={formData.cabangId}
                                onChange={(e) => setFormData({ ...formData, cabangId: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="">-- Pilih Cabang --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Berlaku Mulai Tanggal</label>
                        <input
                            type="date"
                            value={formData.tanggalMulai}
                            onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            Faktor Komisi <span className="text-gray-300 normal-case font-normal">(0.01 – 1.00, contoh: 0.5 = 50%)</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="1"
                            value={formData.faktorKomisi}
                            onChange={(e) => setFormData({ ...formData, faktorKomisi: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            placeholder="0.50"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            <ClipboardList className="inline w-3 h-3 mr-1" />
                            Total faktor semua CS di satu cabang tidak boleh melebihi 1.00 (100%).
                        </p>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
