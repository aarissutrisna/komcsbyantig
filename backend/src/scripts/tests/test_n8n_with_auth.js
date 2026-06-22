// Test N8N webhook dengan secret yang benar
const SECRET = 'VTAFwFNCZn9kS';
const URL = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm?n_days=90';

console.log('🧪 Testing N8N Webhook dengan Auth');
console.log('═══════════════════════════════════\n');
console.log(`Secret: ${SECRET}`);
console.log(`URL: ${URL}\n`);

async function test() {
  try {
    const response = await fetch(URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      signal: AbortSignal.timeout(15000)
    });
    
    console.log(`Status: ${response.status} ${response.statusText}\n`);
    
    const text = await response.text();
    console.log(`Response length: ${text.length} chars`);
    console.log(`First 1500 chars:\n${text.substring(0, 1500)}\n`);
    
    try {
      const json = JSON.parse(text);
      
      if (json.status === 'success') {
        console.log('✅ WEBHOOK BERHASIL!\n');
        console.log(`  Total suppliers: ${json.total_suppliers}`);
        console.log(`  Total invoices: ${json.total_invoices}`);
        console.log(`  Grand total: ${json.grand_total?.toLocaleString('id-ID')}`);
        console.log(`  Query date: ${json.query_date}`);
        console.log(`  N days: ${json.n_days}`);
        
        if (json.data && json.data.length > 0) {
          console.log(`\n Suppliers:`);
          json.data.forEach((s, i) => {
            console.log(`  [${i+1}] ${s.nama_supplier}`);
            console.log(`      Invoices: ${s.jumlah_invoice}`);
            console.log(`      Total: ${s.total_hutang?.toLocaleString('id-ID')}`);
            console.log(`      Earliest due: ${s.jatuh_tempo_terdekat} (${s.sisa_hari_min} hari)`);
            
            if (s.detail_invoices && s.detail_invoices.length > 0) {
              console.log(`      Sample invoice:`);
              const inv = s.detail_invoices[0];
              console.log(`        No: ${inv.notransaksi}`);
              console.log(`        Date: ${inv.tgl_beli}`);
              console.log(`        Due: ${inv.jatuh_tempo}`);
              console.log(`        Amount: ${inv.hutang_awal?.toLocaleString('id-ID')}`);
              console.log(`        Paid: ${inv.sudah_dibayar?.toLocaleString('id-ID')}`);
              console.log(`        Remaining: ${inv.sisa_hutang?.toLocaleString('id-ID')}`);
              console.log(`        Days left: ${inv.sisa_hari}`);
            }
            console.log();
          });
        }
      } else {
        console.log('❌ Webhook returned error:');
        console.log(`  Message: ${json.message || json.error}`);
      }
    } catch (e) {
      console.log('❌ Response bukan JSON valid');
      console.log('  Mungkin HTML error page atau redirect');
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('  Timeout - webhook tidak merespon dalam 15 detik');
    }
  }
}

test();
