import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
    Database,
    Clock,
    History,
    ShieldAlert,
    ChevronRight,
    RefreshCw,
    CheckCircle2,
    FilePlus,
    Upload,
    Calculator,
    AlertTriangle,
} from 'lucide-react';

interface Branch {
    id: string;
    name: string;
}

interface ImportStatus {
    done: boolean;
    at: string | null;
    start: string | null;
    end: string | null;
    count: number;
}

interface SchedulerConfig {
    enabled: boolean;
    time: string;
}

export function AdminSettings() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
    const [scheduler, setScheduler] = useState<SchedulerConfig>({ enabled: false, time: '23:30' });
    const [loading, setLoading] = useState(true);

    // Import Form State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isOverride, setIsOverride] = useState(false);
    const [importing, setImporting] = useState(false);

    // Attendance Import State
    const [csvData, setCsvData] = useState('');
    const [importingAttendance, setImportingAttendance] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: any[] } | null>(null);

    // Recalculate All commissions State
    const [recalculating, setRecalculating] = useState(false);
    const [recalcResult, setRecalcResult] = useState<{
        message: string;
        dates_checked: number;
        commissions_calculated: number;
        skipped: number;
        errors: any[];
    } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [branchData, statusData, schedulerData] = await Promise.all([
                api.get<Branch[]>('/branches'),
                api.get<ImportStatus>('/settings/import-status'),
                api.get<SchedulerConfig>('/settings/scheduler')
            ]);

            setBranches(branchData || []);
            if (branchData && branchData.length > 0) setSelectedBranch(branchData[0].id);
            setImportStatus(statusData);
            setScheduler(schedulerData);
        } catch (err) {
            console.error('Failed to fetch admin settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScheduler = async () => {
        try {
            await api.post('/settings/scheduler', scheduler);
            alert('Pengaturan scheduler berhasil diperbarui');
        } catch (err: any) {
            alert('Gagal memperbarui scheduler: ' + err.message);
        }
    };

    const handleImport = async () => {
        if (!startDate || !endDate) return alert('Pilih range tanggal!');

        const confirmMsg = isOverride
            ? 'PERINGATAN: Tindakan ini akan menghapus data omzet & komisi lama dalam range tersebut dan menghitung ulang semuanya. Lanjutkan?'
            : 'Apakah Anda yakin ingin mengimpor data awal?';

        if (!window.confirm(confirmMsg)) return;

        setImporting(true);
        try {
            await api.post('/omzet/import-historical', {
                branchId: selectedBranch,
                startDate,
                endDate,
                isOverride
            });
            alert('Impor data historis berhasil!');
            fetchData();
        } catch (err: any) {
            alert('Impor gagal: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleImportAttendance = async () => {
        if (!csvData.trim()) return;
        setImportingAttendance(true);
        setImportResult(null);
        try {
            const result = await api.post<any>('/omzet/import-attendance', { csvData });
            setImportResult(result);
            if (result.success > 0) {
                alert(`Import berhasil! ${result.success} data diproses.`);
                setCsvData('');
            }
        } catch (err: any) {
            alert('Import gagal: ' + err.message);
        } finally {
            setImportingAttendance(false);
        }
    };

    const handleRecalculate = async () => {
        if (!window.confirm(
            'PERHATIAN: Proses ini akan MENGHAPUS semua data komisi yang ada, lalu menghitung ulang dari awal berdasarkan data omzet, penugasan CS, dan kehadiran terkini.\n\nProses ini tidak dapat dibatalkan. Yakin melanjutkan?'
        )) return;
        setRecalculating(true);
        setRecalcResult(null);
        try {
            const result = await api.post<any>('/commissions/recalculate-all', {});
            setRecalcResult(result);
        } catch (err: any) {
            alert('Rekalkulasi gagal: ' + err.message);
        } finally {
            setRecalculating(false);
        }
    };

    if (loading) return <LoadingSpinner size="lg" />;

    return (
        <div className="animate-fade-in max-w-4xl">
            <PageHeader
                title="Admin Settings & Integrasi N8N"
                subtitle="Konfigurasi sumber data utama dan automasi penarikan omzet"
            />

            <div className="space-y-8">
                {/* 1. Historical Import Card */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <History className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Data Awal (Historical)</h2>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {importStatus?.done && !isOverride && (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl p-4 flex items-start gap-4">
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="text-green-800 dark:text-green-400 font-bold">Data Awal Sudah Diimpor</h3>
                                    <p className="text-green-700 dark:text-green-500/80 text-sm mt-1">
                                        Terakhir diimpor pada: <b>{new Date(importStatus.at!).toLocaleString('id-ID')}</b><br />
                                        Range: <b>{importStatus.start} s/d {importStatus.end}</b> ({importStatus.count} hari)
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih Cabang</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Range Tanggal</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                                    />
                                    <ChevronRight className="text-gray-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Override Control */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isOverride}
                                        onChange={(e) => setIsOverride(e.target.checked)}
                                    />
                                    <div className={`w-10 h-6 rounded-full transition-colors ${isOverride ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isOverride ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-orange-500 transition-colors">
                                    Force Re-import (Gunakan jika ingin menimpa data yang sudah ada)
                                </span>
                            </label>

                            {isOverride && (
                                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl flex gap-3 text-orange-800 dark:text-orange-400 text-sm">
                                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                    <p>
                                        <b>PERHATIAN:</b> Fitur ini akan menghapus data omzet & komisi pada range tersebut sebelum mengimpor ulang. Komisi akan dikalkulasi ulang berdasarkan data terbaru dari N8N.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={importing || (importStatus?.done && !isOverride)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/10 active:scale-95"
                        >
                            {importing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                            {importing ? 'Sedang Memproses...' : 'Mulai Import Data Awal'}
                        </button>
                    </div>
                </section>

                {/* 2. Scheduler Config Card */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Daily Auto-Fetch</h2>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${scheduler.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                            {scheduler.enabled ? 'AKTIF' : 'NONAKTIF'}
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Sistem akan otomatis mengambil data omzet hari ini dari semua cabang yang memiliki endpoint N8N pada waktu yang ditentukan.
                        </p>

                        <div className="flex flex-col sm:flex-row items-end gap-6">
                            <div className="flex-1 space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Waktu Penarikan (24 Jam)</label>
                                <input
                                    type="time"
                                    value={scheduler.time}
                                    onChange={(e) => setScheduler({ ...scheduler, time: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="flex-1 flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktifkan Scheduler</span>
                                <button
                                    onClick={() => setScheduler({ ...scheduler, enabled: !scheduler.enabled })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${scheduler.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${scheduler.enabled ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleUpdateScheduler}
                            className="w-full py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 font-bold rounded-xl transition-all active:scale-95"
                        >
                            Simpan Pengaturan Scheduler
                        </button>
                    </div>
                </section>

                {/* 3. Bulk Attendance Import */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                <FilePlus className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bulk Import Kehadiran (CSV)</h2>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs space-y-2">
                            <p className="font-bold text-blue-800 dark:text-blue-400">Format CSV:</p>
                            <code className="block bg-white dark:bg-gray-800 p-2 rounded border border-blue-50 dark:border-blue-900/50 font-mono text-blue-600 dark:text-blue-300">
                                TANGGAL;USERNAME;CABANG;KEHADIRAN<br />
                                01/02/2026;cs_jjt;JTW;1<br />
                                01/02/2026;cs_tsm;TSM;0.5
                            </code>
                            <p className="text-blue-700/70 dark:text-blue-400/70 italic">* Pemisah menggunakan titik-koma (;). Kehadiran: 1 (Hadir), 0.5 (Setengah), 0 (Alpha).</p>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Tempel Data CSV di sini</label>
                            <textarea
                                value={csvData}
                                onChange={(e) => setCsvData(e.target.value)}
                                placeholder="TANGGAL;USERNAME;CABANG;KEHADIRAN..."
                                className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs"
                            />
                        </div>

                        <button
                            onClick={handleImportAttendance}
                            disabled={importingAttendance || !csvData.trim()}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/10 active:scale-95"
                        >
                            {importingAttendance ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {importingAttendance ? 'Megimpor Data...' : 'Proses Import Kehadiran'}
                        </button>

                        {importResult && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Hasil Import:</p>
                                <p className="text-xs text-green-600">Berhasil: <b>{importResult.success}</b></p>
                                <p className="text-xs text-red-600">Gagal: <b>{importResult.failed.length}</b></p>
                                {importResult.failed.length > 0 && (
                                    <div className="mt-2 text-[10px] text-red-500 space-y-1">
                                        {importResult.failed.slice(0, 5).map((f: any, i: number) => (
                                            <p key={i}>Baris {f.row}: {f.reason}</p>
                                        ))}
                                        {importResult.failed.length > 5 && <p>...dan {importResult.failed.length - 5} lainnya</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* 4. Rekalkulasi Komisi Total */}
                <section className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden transition-all">
                    <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rekalkulasi Komisi Total</h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl flex gap-3 text-red-800 dark:text-red-400 text-sm">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Kapan digunakan?</p>
                                <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                                    <li>Setelah menambah atau menghapus penugasan CS yang memengaruhi periode lama</li>
                                    <li>Setelah import atau perubahan data kehadiran (CSV)</li>
                                    <li>Setelah perubahan target omzet atau persentase komisi cabang</li>
                                    <li>Jika ada data komisi yang tidak konsisten</li>
                                </ul>
                                <p className="mt-2 font-bold">Efek: Semua data di tabel <code>commissions</code> akan dihapus dan dihitung ulang.</p>
                            </div>
                        </div>

                        {recalcResult && (
                            <div className={`p-4 rounded-xl border text-sm ${recalcResult.errors?.length > 0
                                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30'
                                    : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                                }`}>
                                <p className="font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Rekalkulasi Selesai
                                </p>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="text-2xl font-black text-blue-600">{recalcResult.dates_checked}</div>
                                        <div className="text-xs text-gray-500 mt-1">Hari Dicek</div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="text-2xl font-black text-green-600">{recalcResult.commissions_calculated}</div>
                                        <div className="text-xs text-gray-500 mt-1">Komisi Dihitung</div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                        <div className="text-2xl font-black text-gray-400">{recalcResult.skipped}</div>
                                        <div className="text-xs text-gray-500 mt-1">Hari Dilewati</div>
                                    </div>
                                </div>
                                {recalcResult.errors?.length > 0 && (
                                    <div className="mt-3 text-xs text-red-600 space-y-1">
                                        <p className="font-bold">Error ({recalcResult.errors.length}):</p>
                                        {recalcResult.errors.map((e: any, i: number) => (
                                            <p key={i}>{e.branch_id} / {e.date}: {e.error}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/10 active:scale-95"
                        >
                            {recalculating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                            {recalculating ? 'Menghitung ulang komisi...' : 'Rekalkulasi Semua Komisi'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
