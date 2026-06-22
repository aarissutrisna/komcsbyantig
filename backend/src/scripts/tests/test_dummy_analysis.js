import { transformN8NResponse, deriveAgingCategory, calculateAgingSummary } from '../services/financeDebtService.js';
import * as financeAnalysisService from '../services/financeAnalysisService.js';
import * as financeGroupService from '../services/financeGroupService.js';
import * as financeIncomeService from '../services/financeIncomeService.js';
import pool from '../config/database.js';

// Simulasi response dari N8N webhook hutang-rinci
const dummyN8NResponse = {
  status: "success",
  n_days: 90,
  query_date: "2026-06-21",
  total_suppliers: 3,
  total_invoices: 8,
  grand_total: 450000000,
  data: [
    {
      kode_supplier: "SMSSP",
      nama_supplier: "Sarana Sentral Profilindo (PT)",
      jumlah_invoice: 3,
      total_hutang: 180000000,
      jatuh_tempo_terdekat: "2026-06-25",
      sisa_hari_min: 4,
      detail_invoices: [
        {
          notransaksi: "0032/BL/UTM/0526",
          tgl_beli: "2026-05-07",
          hutang_awal: 36991500,
          sudah_dibayar: 0,
          sisa_hutang: 36991500,
          jatuh_tempo: "2026-06-25",
          sisa_hari: 4
        },
        {
          notransaksi: "0045/BL/UTM/0526",
          tgl_beli: "2026-05-15",
          hutang_awal: 78000000,
          sudah_dibayar: 10000000,
          sisa_hutang: 68000000,
          jatuh_tempo: "2026-07-10",
          sisa_hari: 19
        },
        {
          notransaksi: "0051/BL/UTM/0526",
          tgl_beli: "2026-05-20",
          hutang_awal: 75008500,
          sudah_dibayar: 0,
          sisa_hutang: 75008500,
          jatuh_tempo: "2026-08-01",
          sisa_hari: 41
        }
      ]
    },
    {
      kode_supplier: "PTJBR",
      nama_supplier: "PT Jaya Baja Raya",
      jumlah_invoice: 2,
      total_hutang: 120000000,
      jatuh_tempo_terdekat: "2026-06-15",
      sisa_hari_min: -6,
      detail_invoices: [
        {
          notransaksi: "0018/BL/JTJ/0426",
          tgl_beli: "2026-04-10",
          hutang_awal: 55000000,
          sudah_dibayar: 5000000,
          sisa_hutang: 50000000,
          jatuh_tempo: "2026-06-15",
          sisa_hari: -6
        },
        {
          notransaksi: "0022/BL/JTJ/0426",
          tgl_beli: "2026-04-18",
          hutang_awal: 70000000,
          sudah_dibayar: 0,
          sisa_hutang: 70000000,
          jatuh_tempo: "2026-07-05",
          sisa_hari: 14
        }
      ]
    },
    {
      kode_supplier: "CVMBK",
      nama_supplier: "CV Mega Baja Kencana",
      jumlah_invoice: 3,
      total_hutang: 150000000,
      jatuh_tempo_terdekat: "2026-03-01",
      sisa_hari_min: -112,
      detail_invoices: [
        {
          notransaksi: "0005/BL/UTM/0126",
          tgl_beli: "2026-01-05",
          hutang_awal: 45000000,
          sudah_dibayar: 0,
          sisa_hutang: 45000000,
          jatuh_tempo: "2026-03-01",
          sisa_hari: -112
        },
        {
          notransaksi: "0009/BL/UTM/0226",
          tgl_beli: "2026-02-12",
          hutang_awal: 60000000,
          sudah_dibayar: 15000000,
          sisa_hutang: 45000000,
          jatuh_tempo: "2026-04-15",
          sisa_hari: -67
        },
        {
          notransaksi: "0011/BL/JTJ/0226",
          tgl_beli: "2026-02-20",
          hutang_awal: 60000000,
          sudah_dibayar: 0,
          sisa_hutang: 60000000,
          jatuh_tempo: "2026-07-20",
          sisa_hari: 29
        }
      ]
    }
  ]
};

console.log('═══════════════════════════════════════════════════');
console.log('  SIMULASI MODUL ANALISA KEUANGAN');
console.log('  Menggunakan Dummy Data N8N Webhook');
console.log('═══════════════════════════════════════════════════\n');

// Step 1: Transform N8N response
console.log(' Step 1: Transform N8N Response');
console.log('─────────────────────────────────');
const debts = transformN8NResponse(dummyN8NResponse);
console.log(`  Total invoices extracted: ${debts.length}`);
debts.forEach((d, i) => {
  console.log(`  [${i+1}] ${d.invoice_no.padEnd(20)} | ${d.supplier_name.padEnd(30)} | Sisa: ${d.sisa_hutang.toLocaleString('id-ID').padStart(12)} | JT: ${d.due_date} | Sisa Hari: ${d.sisa_hari} | ${d.aging_category}`);
});

// Step 2: Calculate aging summary
console.log('\n📊 Step 2: Aging Summary');
console.log('────────────────────────');
const agingSummary = calculateAgingSummary(debts);
Object.entries(agingSummary).forEach(([key, val]) => {
  const label = {
    'belum_jatuh_tempo': 'Belum Jatuh Tempo',
    'overdue_1_30': 'Overdue 1-30 Hari',
    'overdue_31_90': 'Overdue 31-90 Hari',
    'overdue_kronis': 'Overdue Kronis'
  }[key];
  console.log(`  ${label.padEnd(22)} | ${val.count} invoice | ${val.total.toLocaleString('id-ID')}`);
});

// Step 3: Check finance groups from DB
console.log('\n🔗 Step 3: Finance Groups dari Database');
console.log('──────────────────────────────────────');
try {
  const groups = await financeGroupService.getAllGroups();
  console.log(`  Total finance groups: ${groups.length}`);
  groups.forEach(g => {
    console.log(`  ${g.group_name.padEnd(20)} | ${g.branch_count} cabang | ${g.branch_ids} | Webhook: ${g.webhook_url}`);
  });
} catch (err) {
  console.log(`  Error: ${err.message}`);
}

// Step 4: Check omzet data for UTM-JTJ group
console.log('\n💰 Step 4: Omzet Data (UTM-JTJ Group)');
console.log('────────────────────────────────────');
try {
  const utmGroupKey = groups.find(g => g.branch_ids.includes('UTM'))?.finance_group_key;
  if (utmGroupKey) {
    const avgRevenue = await financeIncomeService.getAvgDailyRevenue(utmGroupKey, 30);
    console.log(`  Avg Daily Revenue (30 hari): ${avgRevenue.toLocaleString('id-ID')}`);
    
    const history = await financeIncomeService.getDailyRevenueHistory(utmGroupKey, 7);
    console.log(`  Recent 7 days data: ${history.length} records`);
    history.slice(0, 5).forEach(h => {
      console.log(`    ${h.date} | ${h.branch_name.padEnd(5)} | Cash: ${h.cash?.toLocaleString('id-ID')?.padStart(10)} | Piutang: ${h.bayar_piutang?.toLocaleString('id-ID')?.padStart(10)} | Total: ${h.total?.toLocaleString('id-ID')?.padStart(10)}`);
    });
  } else {
    console.log('  ⚠️  UTM-JTJ group not found');
  }
} catch (err) {
  console.log(`  Error: ${err.message}`);
}

// Step 5: Simulate full analysis
console.log('\n🧮 Step 5: Simulasi Full Analysis');
console.log('────────────────────────────────');
console.log('  ️  Skip - memerlukan data omzet yang valid di database');
console.log('  Untuk test penuh, jalankan via API: POST /api/finance/analysis-runs/:groupKey');

// Summary
console.log('\n═══════════════════════════════════════════════════');
console.log('  RINGKASAN SIMULASI');
console.log('═══════════════════════════════════════════════════');
console.log(`  Invoices dari N8N:  ${debts.length}`);
console.log(`  Total Hutang:       ${debts.reduce((s, d) => s + d.sisa_hutang, 0).toLocaleString('id-ID')}`);
console.log(`  Aging Summary:      ${Object.values(agingSummary).reduce((s, v) => s + v.count, 0)} invoice`);
console.log('');
console.log('  Jika angka di atas benar, berarti transform N8N → backend works.');
console.log('  Masalah "0 data" kemungkinan karena:');
console.log('  1. Webhook N8N belum aktif / belum return data');
console.log('  2. Auth header tidak match antara backend dan N8N');
console.log('  3. n_days terlalu pendek (default 90 hari)');
console.log('  4. Webhook URL salah');
console.log('═══════════════════════════════════════════════════');
