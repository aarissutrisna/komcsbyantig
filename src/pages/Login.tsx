import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Building2, Sun, Moon } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      {/* Left Side: Visual Branding */}
      <div
        className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#ec4899] p-12 flex-col justify-between relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-3xl" style={{ animation: 'pulse 8s ease-in-out infinite' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <Building2 className="w-8 h-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight italic">Komisi CS PJB System</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mb-12">
          <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Sistem Komisi CS Puncak Jaya Baja
          </h2>
          <p className="text-white/80 text-xl font-medium">
            Transparan, kredibel, otomatis dan mudah. <br />
            Tingkatkan performa Omzet Anda!
          </p>
        </div>

        <div className="relative z-10 flex gap-4" aria-hidden="true">
          <div className="w-12 h-1 bg-white rounded-full" />
          <div className="w-3 h-1 bg-white/30 rounded-full" />
          <div className="w-3 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 xs:p-8 md:p-16 relative">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 xs:top-8 xs:right-8 flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
            Ubah tampilan
          </span>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:ring-2 hover:ring-blue-500 transition-all shadow-sm"
            aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 animate-spin-once" />
            ) : (
              <Moon className="w-5 h-5 animate-spin-once" />
            )}
          </button>
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile-only Brand */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
              <Building2 className="w-8 h-8 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl xs:text-3xl font-bold text-gray-900 dark:text-white">
              Komisi CS PJB
            </h1>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl xs:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Selamat Datang!
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Silakan masukkan detail akun Anda untuk masuk.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-3.5 rounded-2xl text-sm flex items-center gap-3 animate-shake"
              role="alert"
              aria-live="polite"
            >
              <span className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full animate-ping flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-950 focus:border-transparent outline-none transition-all placeholder-gray-400 shadow-sm focus:-translate-y-px"
                required
                autoComplete="username"
                placeholder="masukkan username"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Lupa?
                </a>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-950 focus:border-transparent outline-none transition-all placeholder-gray-400 shadow-sm focus:-translate-y-px"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center gap-2 mb-4 px-1">
              <input
                type="checkbox"
                id="remember"
                className="rounded-md border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
              >
                Ingat saya selama 30 hari
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111827] dark:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-gray-200 dark:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] flex items-center justify-center gap-3 lg:mt-8"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
