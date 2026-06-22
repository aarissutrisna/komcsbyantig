import { fetchDebtsFromN8N, transformN8NResponse } from './src/services/financeDebtService.js';

const GROUP_KEY = '44b8b27a80f31cd3'; // UTM-JTJ group

console.log('🧪 Testing Full Backend Flow');
console.log('════════════════════════════\n');

try {
  console.log('1. Fetching from N8N...');
  const result = await fetchDebtsFromN8N(GROUP_KEY, 90);
  
  console.log('✅ Fetch successful');
  console.log('  Status:', result.status);
  console.log('  Suppliers:', result.total_suppliers);
  console.log('  Invoices:', result.total_invoices);
  console.log('  Grand total:', result.grand_total?.toLocaleString('id-ID'));
  console.log('  Has aging_summary:', !!result.aging_summary);
  
  console.log('\n2. Transforming response...');
  const debts = transformN8NResponse(result);
  
  console.log('✅ Transform successful');
  console.log('  Debts extracted:', debts.length);
  console.log('  First debt:', JSON.stringify(debts[0], null, 2));
  
  console.log('\n3. Calculating aging summary...');
  const { calculateAgingSummary } = await import('./src/services/financeDebtService.js');
  const aging = calculateAgingSummary(debts);
  
  console.log('✅ Aging summary:');
  Object.entries(aging).forEach(([key, val]) => {
    console.log(`  ${key}: ${val.count} invoice, ${val.total.toLocaleString('id-ID')}`);
  });
  
  console.log('\n🎉 Full flow successful!');
  console.log('  If you see this, backend logic works correctly.');
  console.log('  Issue must be in frontend or API endpoint.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('  Stack:', error.stack);
}
