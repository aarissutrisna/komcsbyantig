import { useAuth } from '../contexts/AuthContext';
import { PlaceholderPage } from '../components/ui/PlaceholderPage';

export function DataAttendance() {
  const { user } = useAuth();

  return (
    <PlaceholderPage
      title="Data Kehadiran & Omzet"
      subtitle="Input dan kelola data kehadiran serta penjualan harian"
      message="Modul data kehadiran dan omzet akan ditampilkan di sini setelah terintegrasi dengan API backend."
      accessNote={`Role Anda: ${user?.role.toUpperCase()}`}
    />
  );
}
