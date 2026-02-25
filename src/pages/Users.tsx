import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Building, Mail, Database, Plus, Pencil, Trash2, Key, Shield, User as UserIcon, UserX, UserCheck } from 'lucide-react';

interface User {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: 'admin' | 'hrd' | 'cs';
  branch_id: string | null;
  is_active: number; // 1=active, 0=resigned
  resign_date: string | null;
  saldo_awal: number;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // Resign modal state
  const [resignTarget, setResignTarget] = useState<User | null>(null);
  const [resignDate, setResignDate] = useState('');
  const [resignSubmitting, setResignSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    email: '',
    password: '',
    role: 'cs' as 'admin' | 'hrd' | 'cs',
    branchId: '',
    saldoAwal: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersData, branchesData] = await Promise.all([
        api.get<User[]>('/auth/users'),
        api.get<Branch[]>('/branches')
      ]);
      setUsers(usersData);
      setBranches(branchesData);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      nama: '',
      username: '',
      email: '',
      password: '',
      role: 'cs',
      branchId: '',
      saldoAwal: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      nama: user.nama,
      username: user.username,
      email: user.email,
      password: '', // Leave empty unless changing
      role: user.role,
      branchId: user.branch_id || '',
      saldoAwal: user.saldo_awal?.toString() || '0'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama.trim()) return alert('Nama Lengkap wajib diisi');
    if (!formData.username.trim()) return alert('Username wajib diisi');
    if (!formData.email.trim()) return alert('Email wajib diisi');

    try {
      const payload = {
        ...formData,
        branchId: formData.branchId || null,
        saldoAwal: parseFloat(formData.saldoAwal || '0')
      };

      if (editingUser) {
        await api.put(`/auth/users/${editingUser.id}`, payload);
        alert('Data pengguna berhasil diperbarui');
      } else {
        if (!formData.password) {
          alert('Password wajib diisi untuk pengguna baru');
          return;
        }
        await api.post('/auth/users', payload);
        alert('Pengguna baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Frontend handleSave error:', err);
      alert(`Gagal menyimpan data pengguna!
Detail: ${err.message || 'Terjadi kesalahan sistem'}
Status: ${err.status || 'N/A'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Data akan hilang permanen. Pengguna yang sudah memiliki riwayat tidak bisa dihapus.')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      alert('Pengguna berhasil dihapus');
      fetchData();
    } catch (err: any) {
      alert(`Gagal menghapus pengguna: ${err.message || 'Terjadi kesalahan sistem'}`);
    }
  };
  const openResignModal = (u: User) => {
    setResignTarget(u);
    // Default to today
    setResignDate(new Date().toISOString().split('T')[0]);
  };

  const handleResign = async () => {
    if (!resignTarget || !resignDate) return;
    setResignSubmitting(true);
    try {
      await api.post(`/auth/users/${resignTarget.id}/resign`, { resign_date: resignDate });
      alert(`${resignTarget.nama} berhasil dinonaktifkan per ${resignDate}`);
      setResignTarget(null);
      fetchData();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally { setResignSubmitting(false); }
  };

  const handleReactivate = async (u: User) => {
    if (!confirm(`Aktifkan kembali akun ${u.nama}?`)) return;
    try {
      await api.post(`/auth/users/${u.id}/reactivate`, {});
      alert(`${u.nama} berhasil diaktifkan kembali`);
      fetchData();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { bg: string, text: string }> = {
      admin: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
      hrd: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
      cs: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
    };
    const style = roles[role] || roles.cs;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}>
        {role}
      </span>
    );
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
          title="Manajemen Pengguna"
          subtitle="Kelola akun Admin, HRD, dan Customer Service (CS)"
        />
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Tambah User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lokasi & Kontak</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-medium">Belum ada pengguna terdaftar.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors uppercase font-bold shadow-sm">
                          {u.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{u.nama}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(u.role)}
                      {u.is_active === 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <UserX className="w-2.5 h-2.5" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Mail className="w-3 h-3 text-blue-500" />
                          {u.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <Building className="w-3 h-3 text-blue-500" />
                          {branches.find(b => b.id === u.branch_id)?.name || 'Semua Cabang (Global)'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.is_active !== 0 ? (
                          <button
                            onClick={() => openResignModal(u)}
                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"
                            title="Nonaktifkan (Resign)"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(u)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors"
                            title="Aktifkan Kembali"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
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
              form="user-form"
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              Simpan Data
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                placeholder="Contoh: Budi Santoso"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="budi_cs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
              >
                <option value="cs">CS (Customer Service)</option>
                <option value="hrd">HRD</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                placeholder="budi@gmail.com"
              />
            </div>
          </div>

          <div className="sm:col-span-2 text-blue-600 dark:text-blue-400 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-2">
            <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              {editingUser
                ? 'Kosongkan password jika tidak ingin mengganti password pengguna ini.'
                : 'Tentukan password awal untuk pengguna baru.'}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              required={!editingUser}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Penempatan Cabang</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none"
              >
                <option value="">Semua Cabang (Global)</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Saldo Awal (Rp)</label>
            <div className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.saldoAwal}
                onChange={(e) => setFormData({ ...formData, saldoAwal: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white font-mono"
                placeholder="0"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 italic">* Digunakan untuk migrasi saldo dari sistem lama.</p>
          </div>

          <div className="sm:col-span-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl text-xs text-yellow-700 dark:text-yellow-400">
            <span className="font-bold">ℹ️ Catatan:</span> Faktor komisi CS dikelola melalui halaman <strong>Penugasan</strong>, bukan dari sini.
          </div>
        </form>
      </Modal>

      {/* ── Resign Confirmation Modal ─────────────────────── */}
      <Modal
        isOpen={!!resignTarget}
        onClose={() => setResignTarget(null)}
        title="Nonaktifkan Pengguna (Resign)"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setResignTarget(null)}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleResign}
              disabled={resignSubmitting || !resignDate}
              className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {resignSubmitting ? 'Memproses...' : 'Konfirmasi Nonaktifkan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
            <UserX className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700 dark:text-orange-400">
              <p className="font-black mb-1">{resignTarget?.nama}</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-orange-600 dark:text-orange-500">
                <li>Login akan diblokir mulai hari ini</li>
                <li>Penugasan aktif akan ditutup per tanggal resign</li>
                <li>Histori komisi & mutasi tetap tersimpan</li>
                <li>Rekalkulasi tidak akan menghitung komisi setelah tanggal resign</li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Tanggal Resign</label>
            <input
              type="date"
              value={resignDate}
              onChange={e => setResignDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Komisi setelah tanggal ini tidak akan dihitung untuk user ini.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
