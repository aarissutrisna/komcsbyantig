import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface Branch {
  id: string;
  name: string;
  target_min: number;
  target_max: number;
  n8n_endpoint: string | null;
}

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    target_min: '',
    target_max: '',
    n8n_endpoint: '',
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const branchData = {
        name: formData.name,
        target_min: parseInt(formData.target_min),
        target_max: parseInt(formData.target_max),
        n8n_endpoint: formData.n8n_endpoint || null,
      };

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', editingBranch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([branchData]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingBranch(null);
      setFormData({ name: '', target_min: '', target_max: '', n8n_endpoint: '' });
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      target_min: branch.target_min.toString(),
      target_max: branch.target_max.toString(),
      n8n_endpoint: branch.n8n_endpoint || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus cabang ini?')) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Cabang</h1>
          <p className="text-gray-600 mt-2">Kelola data cabang dan target omzet</p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            setFormData({ name: '', target_min: '', target_max: '', n8n_endpoint: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Cabang
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama Cabang</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Target Min</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Target Max</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Endpoint N8N</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(branch.target_min)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(branch.target_max)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {branch.n8n_endpoint || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingBranch ? 'Edit Cabang' : 'Tambah Cabang'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Cabang
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Min (0.2%)
                </label>
                <input
                  type="number"
                  value={formData.target_min}
                  onChange={(e) => setFormData({ ...formData, target_min: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Max (0.4%)
                </label>
                <input
                  type="number"
                  value={formData.target_max}
                  onChange={(e) => setFormData({ ...formData, target_max: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endpoint N8N
                </label>
                <input
                  type="url"
                  value={formData.n8n_endpoint}
                  onChange={(e) => setFormData({ ...formData, n8n_endpoint: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBranch(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
