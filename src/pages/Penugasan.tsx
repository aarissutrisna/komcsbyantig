import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Building, User as UserIcon, Plus, Database, ClipboardList, Trash2 } from 'lucide-react';

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

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Fetch users first, with a fallback if /auth/users doesn't work as expected
            let userList: User[] = [];
            try {
                userList = await api.get<User[]>('/auth/users');
            } catch (err) {
                console.error('Failed to fetch from /auth/users, trying /users...', err);
                try {
                    userList = await api.get<User[]>('/users');
                } catch (err2) {
                    console.error('Failed to fetch from /users too', err2);
                }
            }

            if (userList && Array.isArray(userList)) {
                setUsers(userList.filter((u) => u.role?.toLowerCase() === 'cs'));
            }

            // Fetch records and branches
            const [recs, brc] = await Promise.all([
                api.get<PenugasanRecord[]>('/penugasan').catch(e => { console.error(e); return []; }),
                api.get<Branch[]>('/branches').catch(e => { console.error(e); return []; }),
            ]);

            setRecords(recs);
            setBranches(brc);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError('Gagal memuat data. Pastikan tabel cs_penugasan sudah dibuat (node run_migration.js).');
        } finally {
            setLoading(false);
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
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Tambah Penugasan
                </button>
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
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
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

            {/* Modal */}
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
