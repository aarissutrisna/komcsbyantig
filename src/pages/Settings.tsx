import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key } from 'lucide-react';

export function Settings() {
  const { user, changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password baru tidak cocok');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      await changePassword(formData.newPassword);
      setMessage('Password berhasil diubah');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Kelola akun dan preferensi Anda</p>
      </header>

      <div className="max-w-2xl space-y-6">
        {/* Account Info Card */}
        <section
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up stagger-1"
          aria-labelledby="account-info-heading"
        >
          <h2 id="account-info-heading" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Informasi Akun
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Username</dt>
              <dd className="text-gray-900 dark:text-white font-semibold text-lg mt-1">{user?.username || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Lengkap</dt>
              <dd className="text-gray-900 dark:text-white font-semibold text-lg mt-1">{user?.nama || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role Akses</dt>
              <dd className="mt-1">
                <span className="inline-block px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg uppercase">
                  {user?.role}
                </span>
              </dd>
            </div>
            {user?.faktor_pengali && (
              <div>
                <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faktor Pengali</dt>
                <dd className="text-gray-900 dark:text-white font-semibold text-lg mt-1">{user.faktor_pengali}x</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Security Card */}
        <section
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm animate-fade-in-up stagger-2"
          aria-labelledby="security-heading"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="security-heading" className="text-xl font-bold text-gray-900 dark:text-white">
                Keamanan Akun
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update password akun secara berkala</p>
            </div>
          </div>

          {message && (
            <div
              className="mb-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3.5 rounded-xl text-sm flex items-center gap-2"
              role="status"
              aria-live="polite"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" aria-hidden="true" />
              {message}
            </div>
          )}

          {error && (
            <div
              className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3.5 rounded-xl text-sm flex items-center gap-2 animate-shake"
              role="alert"
              aria-live="polite"
            >
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1"
              >
                Password Baru
              </label>
              <input
                id="new-password"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-3.5 bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-950 focus:border-transparent outline-none transition-all placeholder-gray-400 focus:-translate-y-px"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1"
              >
                Konfirmasi Password Baru
              </label>
              <input
                id="confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3.5 bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-950 focus:border-transparent outline-none transition-all placeholder-gray-400 focus:-translate-y-px"
                required
                minLength={6}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 dark:bg-blue-700 text-white py-4 rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {loading ? 'Menyimpan Perubahan...' : 'Simpan Password Baru'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
