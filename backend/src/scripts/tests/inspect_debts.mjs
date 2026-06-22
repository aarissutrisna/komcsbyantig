import '../../config/env.js';
import pool from '../../config/database.js';

async function run() {
  try {
    const [rows] = await pool.execute(
      'SELECT id, source_debt_snapshot, result_json FROM finance_analysis_runs ORDER BY created_at DESC LIMIT 1'
    );
    if (rows.length === 0) {
      console.log('No runs found.');
      return;
    }
    const run = rows[0];
    
    // Parse source_debt_snapshot
    let snapshot = run.source_debt_snapshot;
    if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
    
    let result = run.result_json;
    if (typeof result === 'string') result = JSON.parse(result);

    console.log('=== LATEST RUN DETAILS ===');
    console.log(`Run ID: ${run.id}`);
    
    const suppliers = snapshot.data || [];
    const debts = [];
    for (const sup of suppliers) {
      const invoices = sup.detail_invoices || [];
      for (const inv of invoices) {
        debts.push({
          supplier_name: sup.nama_supplier,
          invoice_no: inv.notransaksi,
          tgl_beli: inv.tgl_beli,
          due_date: inv.jatuh_tempo,
          sisa_hari: parseInt(inv.sisa_hari),
          hutang_awal: parseFloat(inv.hutang_awal),
          sudah_dibayar: parseFloat(inv.sudah_dibayar),
          sisa_hutang: parseFloat(inv.sisa_hutang)
        });
      }
    }
    
    console.log(`Total invoices extracted: ${debts.length}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter to only future active debts
    const futureActive = debts.filter(d => {
      const dueDate = new Date(d.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return dueDate >= today && d.sisa_hutang > 0 && daysUntilDue > 0;
    });

    // Sort future active by target contribution descending
    const futureSorted = futureActive.map(d => {
      const dueDate = new Date(d.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const contrib = d.sisa_hutang / daysUntilDue;
      return { ...d, daysUntilDue, contrib };
    }).sort((a, b) => b.contrib - a.contrib);

    console.log(`\nFuture active invoices (contributing to target) - total: ${futureSorted.length}`);
    console.log('| No | Invoice No | Supplier | Invoice Date | Due Date | Sisa Hari | Sisa Hutang | Target Contribution |');
    console.log('|---|---|---|---|---|---|---|---|');

    let idx = 1;
    let totalTargetCalc = 0;
    for (const d of futureSorted) {
      totalTargetCalc += d.contrib;
      if (idx <= 30) {
        console.log(`| ${idx} | ${d.invoice_no} | ${d.supplier_name} | ${d.tgl_beli} | ${d.due_date} | ${d.daysUntilDue} | ${d.sisa_hutang.toLocaleString('id-ID')} | ${Math.round(d.contrib).toLocaleString('id-ID')} |`);
      }
      idx++;
    }

    
    console.log(`\ncalculated daily target (sum of contributions): ${Math.round(totalTargetCalc).toLocaleString('id-ID')}`);
    
    // Let's also print statistics of daysUntilDue
    const overdueDebts = debts.filter(d => {
      const dueDate = new Date(d.due_date);
      return dueDate < today && d.sisa_hutang > 0;
    });
    console.log(`\nTotal overdue invoices: ${overdueDebts.length}`);
    const overdueSum = overdueDebts.reduce((sum, d) => sum + d.sisa_hutang, 0);
    console.log(`Total overdue amount: ${overdueSum.toLocaleString('id-ID')}`);

    const futureDebts = debts.filter(d => {
      const dueDate = new Date(d.due_date);
      return dueDate >= today && d.sisa_hutang > 0;
    });
    console.log(`Total future invoices: ${futureDebts.length}`);
    const futureSum = futureDebts.reduce((sum, d) => sum + d.sisa_hutang, 0);
    console.log(`Total future amount: ${futureSum.toLocaleString('id-ID')}`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
