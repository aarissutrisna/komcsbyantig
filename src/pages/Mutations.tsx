import { useAuth } from '../contexts/AuthContext';
import { PlaceholderPage } from '../components/ui/PlaceholderPage';

export function Mutations() {
  const { user } = useAuth();

  return (
    <PlaceholderPage
      title="Mutasi Komisi"
      subtitle="Riwayat transaksi komisi dan penarikan"
      message="Modul mutasi dan penarikan akan ditampilkan di sini setelah terintegrasi dengan API backend."
      accessNote={`Role Anda: ${user?.role.toUpperCase()}`}
    />
  );
}
