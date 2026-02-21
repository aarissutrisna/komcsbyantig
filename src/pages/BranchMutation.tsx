import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Building, User as UserIcon, CalendarRange, CheckCircle, Database, Plus, ArrowRightLeft } from 'lucide-react';

interface User {
    id: string;
    nama: string;
    username: string;
    branch_id: string | null;
}

interface Branch {
    id: string;
    name: string;
}

interface HistoryRecord {
    id: string;
    user_id: string;
    user_nama: string;
    username: string;
    cabang_id: string;
    cabang_name: string;
    start_date: string;
    end_date: string | null;
    created_by_nama: string | null;
    created_at: string;
}

export function BranchMutation() {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [affectedDates, setAffectedDates] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        userId: '',
        cabangId: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [hist, usr, brc] = await Promise.all([
                api.get<HistoryRecord[]>('/mutasi/history'),
                api.get<User[]>('/auth/users'),
                api.get<Branch[]>('/branches'),
            ]);
            setHistory(hist);
            setUsers(usr.filter((u: any) => u.role === 'cs'));
            setBranches(brc);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkAffected = async () => {
        if (!formData.cabangId || !formData.startDate) return;
        try {
            const result = await api.get<{ affected_dates: string[] }>(
                `/mutasi/affected-dates?cabangId=${formData.cabangId}&startDate=${formData.startDate}&endDate=${formData.endDate || ''}`
            );
            setAffectedDates(result.affected_dates || []);
        } catch (_) {
            setAffectedDates([]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.userId) return alert('User wajib dipilih');
        if (!formData.cabangId) return alert('Cabang tujuan wajib dipilih');
        if (!formData.startDate) return alert('Tanggal mulai wajib diisi');
        try {
            await api.post('/mutasi', {
                userId: formData.userId,
                cabangId: formData.cabangId,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
            });
            alert('Mutasi berhasil dibuat');
            setIsModalOpen(false);
            setAffectedDates([]);
            fetchAll();
        } catch (err: any) {
            alert(`Gagal membuat mutasi: ${err.message || 'Terjadi kesalahan'}`);
        }
    };

    const openModal = () => {
        setFormData({ userId: '', cabangId: '', startDate: '', endDate: '' });
        setAffectedDates([]);
        setIsModalOpen(true);
    };

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
                    title="Mutasi Cabang"
                    subtitle="Kelola perpindahan sementara user antar cabang dan histori penempatannya"
                />
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Mutasi
                </button>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cabang</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal Mulai</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal Selesai</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dibuat oleh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                                        <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        <p className="font-medium">Belum ada histori mutasi cabang.</p>
                                    </td>
                                </tr>
                            ) : (
                                history.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase text-sm">
                                                    {h.user_nama?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{h.user_nama}</div>
                                                    <div className="text-xs text-gray-400">@{h.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{h.cabang_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                {new Date(h.start_date).toLocaleDateString('id-ID')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                                                {h.end_date ? new Date(h.end_date).toLocaleDateString('id-ID') : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {h.end_date && new Date(h.end_date) < new Date() ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Selesai</span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                                                    <CheckCircle className="w-3 h-3" /> Aktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{h.created_by_nama || 'System'}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Mutation Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Tambah Mutasi Cabang"
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
                            form="mutation-form"
                            type="submit"
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                        >
                            Simpan Mutasi
                        </button>
                    </div>
                }
            >
                <form id="mutation-form" onSubmit={handleSave} className="space-y-4" noValidate>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">User CS</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="">-- Pilih User --</option>
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
                                onChange={(e) => { setFormData({ ...formData, cabangId: e.target.value }); setAffectedDates([]); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="">-- Pilih Cabang --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Mulai</label>
                            <div className="relative">
                                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); setAffectedDates([]); }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Selesai <span className="text-gray-300 normal-case font-normal">(kosongkan = permanen)</span></label>
                            <div className="relative">
                                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Affected Dates Preview */}
                    <div>
                        <button
                            type="button"
                            onClick={checkAffected}
                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                        >
                            <ArrowRightLeft className="w-3 h-3" />
                            Cek tanggal yang terdampak recalculation
                        </button>
                        {affectedDates.length > 0 && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
                                <p className="font-bold mb-1">{affectedDates.length} tanggal sudah memiliki data komisi:</p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {affectedDates.map((d) => (
                                        <span key={d} className="bg-yellow-100 dark:bg-yellow-900/20 px-2 py-0.5 rounded font-mono">
                                            {new Date(d).toLocaleDateString('id-ID')}
                                        </span>
                                    ))}
                                </div>
                                <p className="mt-1 font-medium text-yellow-600">Recalculate komisi untuk tanggal ini setelah mutasi dibuat.</p>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}
