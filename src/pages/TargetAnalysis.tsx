import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine
} from 'recharts';
import {
    TrendingUp,
    Target,
    Calculator,
    Building,
    RefreshCw,
    Info,
    LayoutGrid
} from 'lucide-react';

interface Branch { id: string; name: string; }

interface TrendData {
    year: number;
    month: number;
    total_omzet: string | number;
    avg_daily: string | number;
    median_daily: string | number;
    win_rate_max: string | number;
    win_rate_min: string | number;
}

interface SimulationResult {
    period: string;
    daysCount: number;
    hitsMax: number;
    hitsMin: number;
    winRateMax: number;
    winRateMin: number;
    avgDaily: number;
    medianDaily: number;
}

const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const YEAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

type ChartMode = 'recent' | 'yoy';

export function TargetAnalysis() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [allTrends, setAllTrends] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(false);

    // Chart controls
    const [chartMode, setChartMode] = useState<ChartMode>('recent');
    const [recentMonths, setRecentMonths] = useState(6);   // 3–12
    const [yoyYears, setYoyYears] = useState(2);           // 1–5 years back

    // Suggestion % controls
    const [minPct, setMinPct] = useState(80);
    const [maxPct, setMaxPct] = useState(120);

    // Simulator
    const [simParams, setSimParams] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        minTarget: 30000000,
        maxTarget: 60000000
    });
    const [simResult, setSimResult] = useState<SimulationResult | null>(null);
    const [simLoading, setSimLoading] = useState(false);

    // Filter/Utility constants
    const currentYear = new Date().getFullYear();

    // Table year filter
    const tableYears = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i).reverse();
    const [selectedTableYear, setSelectedTableYear] = useState(currentYear);

    useEffect(() => { fetchBranches(); }, []);
    useEffect(() => { if (selectedBranch) fetchTrends(); }, [selectedBranch]);

    const fetchBranches = async () => {
        try {
            // Fetch with 24 months to have enough data for YoY
            const data = await api.get<Branch[]>('/branches');
            setBranches(data);
            if (data.length > 0) setSelectedBranch(data[0].id);
        } catch (err) { console.error(err); }
    };

    const fetchTrends = async () => {
        setLoading(true);
        try {
            // always fetch all available (up to 24)
            const data = await api.get<TrendData[]>(`/omzet-analysis/trends?branchId=${selectedBranch}`);
            setAllTrends(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ── MODE 1: Recent X months ──────────────────────────────────────────────
    const recentChartData = useMemo(() => {
        return allTrends
            .slice(0, recentMonths)
            .reverse()
            .map(t => ({
                name: `${MONTH_NAMES[t.month - 1]}`,
                label: `${MONTH_NAMES[t.month - 1]} '${String(t.year).slice(2)}`,
                total: parseFloat(t.total_omzet as string) / 1_000_000,
                avg: parseFloat(t.avg_daily as string) / 1_000_000,
                median: parseFloat(t.median_daily as string) / 1_000_000,
            }));
    }, [allTrends, recentMonths]);

    const avgOmzetRecent = recentChartData.length
        ? recentChartData.reduce((s, d) => s + d.total, 0) / recentChartData.length : 0;
    const avgHarianRecent = recentChartData.length
        ? recentChartData.reduce((s, d) => s + d.avg, 0) / recentChartData.length : 0;

    // ── MODE 2: YoY grouped by month ────────────────────────────────────────
    const yoyYearList = Array.from({ length: yoyYears }, (_, i) => currentYear - i).reverse();

    const yoyChartData = useMemo(() => {
        // Build 12-slot array (Jan–Des), each slot has a value per selected year
        return MONTH_NAMES.map((name, idx) => {
            const monthNum = idx + 1;
            const entry: Record<string, number | string> = { name };
            yoyYearList.forEach(yr => {
                const found = allTrends.find(t => t.year === yr && t.month === monthNum);
                entry[String(yr)] = found ? parseFloat(found.total_omzet as string) / 1_000_000 : 0;
            });
            return entry;
        });
    }, [allTrends, yoyYears, yoyYearList]);

    // ── Simulator ────────────────────────────────────────────────────────────
    const [applyLoading, setApplyLoading] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);

    const handleRunSimulation = async () => {
        setSimLoading(true);
        setApplySuccess(false);
        try {
            const data = await api.post<SimulationResult>('/omzet-analysis/simulate', { branchId: selectedBranch, ...simParams });
            setSimResult(data);
        } catch (err: any) {
            alert(err.message || 'Gagal menjalankan simulasi');
        } finally { setSimLoading(false); }
    };

    const handleApplyTarget = async () => {
        if (!simResult) return;
        const branchName = branches.find(b => b.id === selectedBranch)?.name ?? selectedBranch;
        const monthName = MONTH_NAMES[simParams.month - 1];
        const confirmed = confirm(
            `Terapkan target berikut ke ${branchName} untuk ${monthName} ${simParams.year}?\n\n` +
            `Min: ${formatIDR(simParams.minTarget)}\nMax: ${formatIDR(simParams.maxTarget)}\n\n` +
            `⚠️ Sistem akan otomatis merekalkukasi komisi bulan tersebut.`
        );
        if (!confirmed) return;
        setApplyLoading(true);
        try {
            await api.post('/targets/save', {
                branchId: selectedBranch,
                month: simParams.month,
                year: simParams.year,
                min_omzet: simParams.minTarget,
                max_omzet: simParams.maxTarget
            });
            setApplySuccess(true);
        } catch (err: any) {
            alert(err.message || 'Gagal menerapkan target');
        } finally { setApplyLoading(false); }
    };

    const handleRebuild = async () => {
        if (!confirm('Rebuild ulang statistik bulan ini?')) return;
        try {
            await api.post('/omzet-analysis/rebuild', { branchId: selectedBranch, year: simParams.year, month: simParams.month });
            alert('Statistik berhasil diperbarui');
            fetchTrends();
        } catch { alert('Gagal memperbarui statistik'); }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analisa & Simulasi Target"
                subtitle="Analisa data historis omzet untuk menentukan target yang optimal"
            />

            {/* Controls Bar */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 min-w-[150px]">
                    <Building className="w-4 h-4 text-gray-400 shrink-0" />
                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm outline-none dark:text-white focus:ring-2 focus:ring-blue-500">
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                {/* Chart mode toggle */}
                <div className="flex items-center gap-1 ml-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setChartMode('recent')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartMode === 'recent' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                        📈 Tren Bulanan
                    </button>
                    <button onClick={() => setChartMode('yoy')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${chartMode === 'yoy' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}>
                        <LayoutGrid className="w-3 h-3 inline mr-1" />Perbandingan Tahunan
                    </button>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Rata2 Omzet Bulanan</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{avgOmzetRecent.toFixed(1)} Jt</p>
                            <p className="text-[10px] text-gray-400 mt-1">{recentMonths} bln terakhir</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Rata2 Omzet Harian</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{avgHarianRecent.toFixed(1)} Jt</p>
                            <p className="text-[10px] text-gray-400 mt-1">basis penetapan target</p>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Saran Min Target</p>
                            <p className="text-lg font-bold text-emerald-600 mt-1">{formatIDR(avgHarianRecent * (minPct / 100) * 1_000_000)}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <input type="range" min={50} max={150} step={5} value={minPct}
                                    onChange={(e) => setMinPct(parseInt(e.target.value))}
                                    className="flex-1 accent-emerald-500 h-1 cursor-pointer" />
                                <span className="text-[11px] font-bold text-emerald-600 w-8 text-right">{minPct}%</span>
                            </div>
                            <button onClick={() => setSimParams(p => ({ ...p, minTarget: Math.round(avgHarianRecent * (minPct / 100) * 1_000_000) }))}
                                className="mt-1.5 text-[9px] text-emerald-600 hover:underline">← Pakai di Simulator</button>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Saran Max Target</p>
                            <p className="text-lg font-bold text-blue-600 mt-1">{formatIDR(avgHarianRecent * (maxPct / 100) * 1_000_000)}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <input type="range" min={80} max={200} step={5} value={maxPct}
                                    onChange={(e) => setMaxPct(parseInt(e.target.value))}
                                    className="flex-1 accent-blue-500 h-1 cursor-pointer" />
                                <span className="text-[11px] font-bold text-blue-600 w-8 text-right">{maxPct}%</span>
                            </div>
                            <button onClick={() => setSimParams(p => ({ ...p, maxTarget: Math.round(avgHarianRecent * (maxPct / 100) * 1_000_000) }))}
                                className="mt-1.5 text-[9px] text-blue-600 hover:underline">← Pakai di Simulator</button>
                        </div>
                    </div>

                    {/* ── CHART AREA ── */}
                    {chartMode === 'recent' ? (
                        /* ── Mode 1: Tren X Bulan Terakhir ── */
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Bar: Total Bulanan */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                                            Total Omzet Bulanan
                                        </h3>
                                        <p className="text-[11px] text-gray-400 mt-0.5">Batang lebih tinggi = omzet lebih besar. Garis kuning = rata-rata.</p>
                                    </div>
                                    {/* Slider 1–12 months */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-bold text-gray-400">{recentMonths} bln</span>
                                        <input type="range" min={3} max={12} step={1} value={recentMonths}
                                            onChange={(e) => setRecentMonths(parseInt(e.target.value))}
                                            className="w-20 accent-blue-600" />
                                    </div>
                                </div>
                                <div className="h-[270px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={recentChartData} barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#8884d822" vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                            <YAxis fontSize={11} stroke="#94a3b8"
                                                tickFormatter={(v) => `${Math.round(v).toLocaleString('id-ID')}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelFormatter={(label, payload) => payload?.[0]?.payload?.label ?? label}
                                                formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)} Juta`, 'Total Omzet']}
                                            />
                                            <ReferenceLine y={avgOmzetRecent} stroke="#f59e0b" strokeDasharray="5 5"
                                                label={{ value: 'Rata2', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
                                            <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Total Omzet" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Line: Statistik Harian */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Calculator className="w-5 h-5 text-blue-500" />
                                        Statistik Harian (Juta Rp/hari)
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        <span className="text-blue-500 font-bold">Rata-rata</span> — dipengaruhi hari promo. &nbsp;
                                        <span className="text-emerald-500 font-bold">Median</span> — lebih stabil untuk target.
                                    </p>
                                </div>
                                <div className="h-[270px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={recentChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#8884d822" vertical={false} />
                                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                            <YAxis fontSize={11} stroke="#94a3b8"
                                                tickFormatter={(v) => `${Math.round(v).toLocaleString('id-ID')}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelFormatter={(label, payload) => payload?.[0]?.payload?.label ?? label}
                                                formatter={(v: number | undefined, name: string | undefined) => [`${(v ?? 0).toFixed(1)} Juta/hari`, name ?? '']}
                                            />
                                            <Legend verticalAlign="top" height={32} />
                                            <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Rata-rata" />
                                            <Line type="monotone" dataKey="median" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Median" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">💡 Pakai Median sebagai basis Min Target, Rata-rata sebagai basis Max Target.</p>
                            </div>
                        </div>
                    ) : (
                        /* ── Mode 2: Perbandingan Tahunan (YoY) ── */
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <LayoutGrid className="w-5 h-5 text-blue-500" />
                                        Perbandingan Total Omzet — Bulan yang Sama Antar Tahun
                                    </h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Setiap kelompok batang = satu bulan. Warna berbeda = tahun berbeda. Berguna untuk melihat apakah tiap bulan tumbuh atau turun.
                                    </p>
                                </div>
                                {/* Year count control chips */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] font-bold text-gray-400 mr-1">Tahun:</span>
                                    {([1, 2, 3, 4, 5] as const).map(n => (
                                        <button key={n} onClick={() => setYoyYears(n)}
                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${yoyYears === n
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Year colour legend */}
                            <div className="flex items-center gap-4 mb-4 flex-wrap">
                                {yoyYearList.map((yr, i) => (
                                    <div key={yr} className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: YEAR_COLORS[i] }} />
                                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">{yr}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={yoyChartData} barCategoryGap="20%" barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#8884d822" vertical={false} />
                                        <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                        <YAxis fontSize={11} stroke="#94a3b8"
                                            tickFormatter={(v) => `${Math.round(v).toLocaleString('id-ID')}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(v: number | undefined, name: string | undefined) => [`${(v ?? 0).toFixed(1)} Juta`, name ?? '']}
                                        />
                                        <Legend verticalAlign="top" height={32} />
                                        {yoyYearList.map((yr, i) => (
                                            <Bar key={yr} dataKey={String(yr)} name={String(yr)}
                                                fill={YEAR_COLORS[i % YEAR_COLORS.length]}
                                                radius={[4, 4, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* ── Simulator ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <Target className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Simulator Target</h3>
                                    <p className="text-[10px] text-gray-400">Uji angka target terhadap data historis</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 leading-relaxed">
                                    Pilih bulan acuan → masukkan angka Min/Max → klik "Jalankan" untuk melihat berapa hari CS akan tembus target tersebut.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Bulan Acuan</label>
                                        <select value={simParams.month}
                                            onChange={(e) => setSimParams({ ...simParams, month: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm outline-none dark:text-white">
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tahun Acuan</label>
                                        <select value={simParams.year}
                                            onChange={(e) => setSimParams({ ...simParams, year: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm outline-none dark:text-white">
                                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Min Target (Rp)</label>
                                    <input type="number" value={simParams.minTarget}
                                        onChange={(e) => setSimParams({ ...simParams, minTarget: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm outline-none dark:text-white focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-[9px] text-gray-400 mt-1 ml-1">{formatIDR(simParams.minTarget)}</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Max Target (Rp)</label>
                                    <input type="number" value={simParams.maxTarget}
                                        onChange={(e) => setSimParams({ ...simParams, maxTarget: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm outline-none dark:text-white focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-[9px] text-gray-400 mt-1 ml-1">{formatIDR(simParams.maxTarget)}</p>
                                </div>

                                <button onClick={handleRunSimulation} disabled={simLoading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50">
                                    {simLoading ? 'Menghitung...' : 'Jalankan Simulasi ▶'}
                                </button>

                                <button onClick={handleRebuild}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-blue-500 transition-colors">
                                    <RefreshCw className="w-3 h-3" />
                                    Refresh Statistik Bulan Ini
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            {!simResult ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-4">
                                        <Calculator className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Belum ada simulasi</h4>
                                    <p className="text-sm text-gray-500 max-w-xs">Isi panel kiri lalu klik "Jalankan Simulasi".</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">
                                            Hasil — {MONTH_NAMES[(parseInt(simResult.period.split('-')[1]) || 1) - 1]} {simResult.period.split('-')[0]}
                                        </h3>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{simResult.daysCount} hari data ditemukan</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Tembus MAX</p>
                                            <p className="text-3xl font-bold text-emerald-600">{simResult.winRateMax.toFixed(1)}%</p>
                                            <p className="text-xs text-emerald-500 mt-1">{simResult.hitsMax} dari {simResult.daysCount} hari</p>
                                            <p className="text-[10px] text-gray-500 mt-2">≈ {(simResult.winRateMax / 10).toFixed(1)}x per 10 hari</p>
                                        </div>
                                        <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Tembus MIN</p>
                                            <p className="text-3xl font-bold text-blue-600">{simResult.winRateMin.toFixed(1)}%</p>
                                            <p className="text-xs text-blue-500 mt-1">{simResult.hitsMin} dari {simResult.daysCount} hari</p>
                                            <p className="text-[10px] text-gray-500 mt-2">Gagal Min: {simResult.daysCount - simResult.hitsMin} hari</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Rata-rata Harian Aktual</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatIDR(simResult.avgDaily)}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Median Harian Aktual</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatIDR(simResult.medianDaily)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                                        <div className="flex gap-3">
                                            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                {simResult.winRateMax > 60
                                                    ? '⚠️ Target Max terlalu ringan. Pertimbangkan menaikkan angka Max.'
                                                    : simResult.winRateMax < 15
                                                        ? '⚠️ Target Max terlalu berat. Pertimbangkan menurunkan Max.'
                                                        : simResult.winRateMin < 40
                                                            ? '⚠️ Terlalu banyak hari gagal Min. Pertimbangkan menurunkan sedikit angka Min.'
                                                            : '✅ Target cukup seimbang untuk memotivasi tim secara konsisten.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Terapkan Target */}
                                    {applySuccess ? (
                                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30">
                                            <span className="text-lg">✅</span>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Target berhasil diterapkan!</p>
                                                <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                                                    Komisi {MONTH_NAMES[simParams.month - 1]} {simParams.year} sudah direkalkukasi secara otomatis. Cek halaman Data Absensi untuk hasilnya.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30">
                                                <span className="text-red-500 text-sm shrink-0 mt-0.5">⚠️</span>
                                                <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                                                    Menekan tombol di bawah akan <strong>menimpa target yang sudah ada</strong> dan memicu rekalkulasi komisi seluruh CS di cabang ini untuk {MONTH_NAMES[simParams.month - 1]} {simParams.year}.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleApplyTarget}
                                                disabled={applyLoading}
                                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {applyLoading
                                                    ? <><span className="animate-spin">⏳</span> Menerapkan & Merekalkukasi...</>
                                                    : <>✓ Terapkan Target ke {MONTH_NAMES[simParams.month - 1]} {simParams.year}</>
                                                }
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monthly Table */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">Riwayat Performa Bulanan</h3>

                            {/* Year Tabs */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                {tableYears.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedTableYear(year)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTableYear === year
                                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Bln/Thn</th>
                                        <th className="px-6 py-4">Total Omzet</th>
                                        <th className="px-6 py-4">Rerata/Hari</th>
                                        <th className="px-6 py-4">Median</th>
                                        <th className="px-6 py-4">Win Rate Max</th>
                                        <th className="px-6 py-4">Win Rate Min</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {allTrends
                                        .filter(t => t.year === selectedTableYear)
                                        .map((t, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{MONTH_NAMES[t.month - 1]} {t.year}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatIDR(parseFloat(t.total_omzet as string))}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatIDR(parseFloat(t.avg_daily as string))}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatIDR(parseFloat(t.median_daily as string))}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${parseFloat(t.win_rate_max as string) > 40
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                                                        {parseFloat(t.win_rate_max as string).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${parseFloat(t.win_rate_min as string) > 60
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                                                        {parseFloat(t.win_rate_min as string).toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
