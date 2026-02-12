import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface User {
  id: string;
  username: string;
  nama: string;
  role: 'admin' | 'hrd' | 'cs';
  branch_id: string | null;
  faktor_pengali: number | null;
}

interface Branch {
  id: string;
  name: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    nama: '',
    role: 'cs' as 'admin' | 'hrd' | 'cs',
    branch_id: '',
    faktor_pengali: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, branchesRes] = await Promise.all([
        supabase.from('users').select('*').order('nama'),
        supabase.from('branches').select('id, name').order('name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (branchesRes.error) throw branchesRes.error;

      setUsers(usersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const updateData: any = {
          username: formData.username,
          nama: formData.nama,
          role: formData.role,
          branch_id: formData.branch_id || null,
          faktor_pengali: formData.faktor_pengali ? parseFloat(formData.faktor_pengali) : null,
        };

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: userError } = await supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              username: formData.username,
              nama: formData.nama,
              role: formData.role,
              branch_id: formData.branch_id || null,
              faktor_pengali: formData.faktor_pengali ? parseFloat(formData.faktor_pengali) : null,
            }]);

          if (userError) throw userError;
        }
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        username: '',
        nama: '',
        role: 'cs',
        branch_id: '',
        faktor_pengali: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Terjadi kesalahan');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: '',
      password: '',
      username: user.username,
      nama: user.nama,
      role: user.role,
      branch_id: user.branch_id || '',
      faktor_pengali: user.faktor_pengali?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengguna ini?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    return branches.find(b => b.id === branchId)?.name || '-';
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
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-gray-600 mt-2">Kelola akun pengguna sistem</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({
              email: '',
              password: '',
              username: '',
              nama: '',
              role: 'cs',
              branch_id: '',
              faktor_pengali: '',
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Pengguna
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Username</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cabang</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Faktor</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{user.nama}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' :
                      user.role === 'hrd' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getBranchName(user.branch_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.faktor_pengali || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(user)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="cs">CS</option>
                  <option value="hrd">HRD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Pilih Cabang</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              {(formData.role === 'cs') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faktor Pengali</label>
                  <select
                    value={formData.faktor_pengali}
                    onChange={(e) => setFormData({ ...formData, faktor_pengali: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Pilih Faktor</option>
                    <option value="0.75">0.75</option>
                    <option value="0.50">0.50</option>
                    <option value="0.25">0.25</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
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
