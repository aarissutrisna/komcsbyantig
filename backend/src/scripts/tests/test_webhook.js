import { fetchDebtsFromN8N } from '../services/financeDebtService.js';

async function test() {
  console.log('🧪 Testing N8N webhook connection...\n');
  
  // Test UTM-JTJ group
  const utmGroupKey = '44b8b27a80f31cd3'; // dari database
  
  try {
    console.log('1. Fetching debts for UTM-JTJ group...');
    const result = await fetchDebtsFromN8N(utmGroupKey, 90);
    
    console.log('\n Response from N8N:');
    console.log('  Status:', result.status);
    console.log('  Total suppliers:', result.total_suppliers);
    console.log('  Total invoices:', result.total_invoices);
    console.log('  Grand total:', result.grand_total);
    console.log('  Query date:', result.query_date);
    console.log('  N days:', result.n_days);
    
    if (result.data && result.data.length > 0) {
      console.log('\n📦 First supplier:');
      console.log('  Name:', result.data[0].nama_supplier);
      console.log('  Invoices:', result.data[0].jumlah_invoice);
      console.log('  Total debt:', result.data[0].total_hutang);
      
      if (result.data[0].detail_invoices && result.data[0].detail_invoices.length > 0) {
        console.log('\n📄 First invoice:');
        console.log('  No:', result.data[0].detail_invoices[0].notransaksi);
        console.log('  Date:', result.data[0].detail_invoices[0].tgl_beli);
        console.log('  Due:', result.data[0].detail_invoices[0].jatuh_tempo);
        console.log('  Amount:', result.data[0].detail_invoices[0].hutang_awal);
        console.log('  Paid:', result.data[0].detail_invoices[0].sudah_dibayar);
        console.log('  Remaining:', result.data[0].detail_invoices[0].sisa_hutang);
        console.log('  Days left:', result.data[0].detail_invoices[0].sisa_hari);
      }
    } else {
      console.log('\n⚠️  No data returned from webhook');
      console.log('  Possible causes:');
      console.log('  - Webhook not active in N8N');
      console.log('  - No debts in the specified period (90 days)');
      console.log('  - Auth failed');
      console.log('  - Webhook URL incorrect');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

test();
