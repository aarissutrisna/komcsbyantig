import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Building2, MapPin, Target, Database, Plus, Pencil, Trash2, Globe, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface Branch {
  id: string;
  name: string;
  city: string;
  target_min: string;
  target_max: string;
  comm_perc_min: string;
  comm_perc_max: string;
  n8n_endpoint: string | null;
  n8n_secret: string | null;
  last_sync_at: string | null;
}

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    city: '',
    target_min: '5000000',
    target_max: '10000000',
    comm_perc_min: '0.2',
    comm_perc_max: '0.4',
    n8n_endpoint: '',
    n8n_secret: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await api.get<Branch[]>('/branches');
      setBranches(data);
    } catch (err) {
      console.error('Fetch branches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      id: '',
      name: '',
      city: '',
      target_min: '5000000',
      target_max: '10000000',
      comm_perc_min: '0.2',
      comm_perc_max: '0.4',
      n8n_endpoint: '',
      n8n_secret: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      id: branch.id,
      name: branch.name,
      city: branch.city,
      target_min: branch.target_min,
      target_max: branch.target_max,
      comm_perc_min: branch.comm_perc_min || '0.2',
      comm_perc_max: branch.comm_perc_max || '0.4',
      n8n_endpoint: branch.n8n_endpoint || '',
      n8n_secret: branch.n8n_secret || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id.trim()) return alert('Kode Cabang (ID) wajib diisi');
    if (!formData.name.trim()) return alert('Nama Cabang wajib diisi');
    if (!formData.city.trim()) return alert('Kota wajib diisi');
    if (!formData.target_min || formData.target_min.toString().trim() === '') return alert('Target Min wajib diisi');
    if (!formData.target_max || formData.target_max.toString().trim() === '') return alert('Target Max wajib diisi');

    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, formData);
        alert('Data cabang berhasil diperbarui');
      } else {
        await api.post('/branches', formData);
        alert('Cabang baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      alert(`Gagal menyimpan data cabang: ${err.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus cabang ini? Data yang terkait mungkin akan hilang.')) return;
    try {
      await api.delete(`/branches/${id}`);
      fetchBranches();
    } catch (err) {
      alert('Gagal menghapus cabang');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <PageHeader
          title="Manajemen Cabang"
          subtitle="Kelola daftar cabang Puncak Jaya Baja dan target penjualannya"
        />
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Tambah Cabang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400">
            <Database className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">Tidak ada data cabang yang tersedia.</p>
            <button onClick={openAddModal} className="mt-4 text-blue-600 font-bold hover:underline">
              Buat cabang pertama Anda
            </button>
          </div>
        ) : (
          branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Building2 className="w-24 h-24 text-blue-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {branch.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(branch)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <Target className="w-3 h-3" />
                      Target Min
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(branch.target_min))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-blue-500" />
                      Target Max
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(parseFloat(branch.target_max))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800/50 pt-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      Komisi (Min - Max)
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {branch.comm_perc_min}% - {branch.comm_perc_max}%
                    </span>
                  </div>

                  {branch.n8n_endpoint && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 truncate">
                      <Globe className="w-3 h-3 flex-shrink-0 text-blue-400" />
                      <span className="truncate">{branch.n8n_endpoint}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-bold text-blue-500 uppercase">ID: {branch.id}</span>
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded italic">
                    Sync: {branch.last_sync_at ? new Date(branch.last_sync_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Edit Cabang' : 'Tambah Cabang Baru'}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
            >
              Batal
            </button>
            <button
              form="branch-form"
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              Simpan
            </button>
          </div>
        }
      >
        <form id="branch-form" onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Cabang (ID)</label>
            <input
              type="text"
              required
              disabled={!!editingBranch}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white ${editingBranch ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Contoh: UTM, JTW, TSM"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nama Cabang</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="Contoh: Jakarta - UTM"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kota</label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="Contoh: Jakarta"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Min</label>
              <input
                type="number"
                required
                value={formData.target_min}
                onChange={(e) => setFormData({ ...formData, target_min: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target Max</label>
              <input
                type="number"
                required
                value={formData.target_max}
                onChange={(e) => setFormData({ ...formData, target_max: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-emerald-600 dark:text-emerald-400">Komisi Min (%)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.comm_perc_min}
                onChange={(e) => setFormData({ ...formData, comm_perc_min: e.target.value })}
                className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                placeholder="Misal: 0.2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-emerald-600 dark:text-emerald-400">Komisi Max (%)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.comm_perc_max}
                onChange={(e) => setFormData({ ...formData, comm_perc_max: e.target.value })}
                className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                placeholder="Misal: 0.4"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">n8n Webhook URL</label>
            <input
              type="url"
              value={formData.n8n_endpoint}
              onChange={(e) => setFormData({ ...formData, n8n_endpoint: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="https://primary-production.up.railway.app/webhook/..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">N8N Webhook Secret (Opsional)</label>
            <input
              type="text"
              value={formData.n8n_secret}
              onChange={(e) => setFormData({ ...formData, n8n_secret: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
              placeholder="Kosongkan untuk pakai rahasia Global (.env)"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
