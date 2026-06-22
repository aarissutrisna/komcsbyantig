// Test koneksi langsung ke N8N webhook
const WEBHOOK_URL = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm';
const N_DAYS = 90;

console.log(' Testing N8N Webhook Connection');
console.log('═══════════════════════════════════\n');
console.log(`URL: ${WEBHOOK_URL}`);
console.log(`n_days: ${N_DAYS}\n`);

async function testWebhook() {
  try {
    // Test 1: Tanpa auth
    console.log('Test 1: Request tanpa auth header');
    console.log('─────────────────────────────────');
    const response1 = await fetch(`${WEBHOOK_URL}?n_days=${N_DAYS}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    
    console.log(`Status: ${response1.status} ${response1.statusText}`);
    const text1 = await response1.text();
    console.log(`Response (first 500 chars):\n${text1.substring(0, 500)}\n`);
    
    // Test 2: Dengan auth dari database
    console.log('Test 2: Request dengan auth dari database');
    console.log('─────────────────────────────────────────');
    
    // Baca .env untuk N8N_WEBHOOK_SECRET
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env', 'utf8');
    const n8nSecret = envContent.match(/N8N_WEBHOOK_SECRET=(.*)/)?.[1]?.trim();
    
    if (n8nSecret && n8nSecret !== 'your_n8n_webhook_token_here') {
      console.log(`Using secret: ${n8nSecret.substring(0, 10)}...`);
      const response2 = await fetch(`${WEBHOOK_URL}?n_days=${N_DAYS}`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${n8nSecret}`
        },
        signal: AbortSignal.timeout(15000)
      });
      
      console.log(`Status: ${response2.status} ${response2.statusText}`);
      const text2 = await response2.text();
      console.log(`Response (first 500 chars):\n${text2.substring(0, 500)}\n`);
      
      try {
        const json2 = JSON.parse(text2);
        if (json2.status === 'success') {
          console.log('✅ Webhook berhasil!');
          console.log(`  Total suppliers: ${json2.total_suppliers}`);
          console.log(`  Total invoices: ${json2.total_invoices}`);
          console.log(`  Grand total: ${json2.grand_total?.toLocaleString('id-ID')}`);
        } else {
          console.log('❌ Webhook return error:', json2.message || json2.error);
        }
      } catch (e) {
        console.log('❌ Response bukan JSON valid');
      }
    } else {
      console.log('⚠️  N8N_WEBHOOK_SECRET tidak ditemukan di .env');
      console.log('   Silakan test manual dengan secret yang benar');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('   Timeout - webhook tidak merespon dalam 15 detik');
      console.error('   Kemungkinan:');
      console.error('   - N8N server tidak accessible dari komputer ini');
      console.error('   - Firewall blocking');
      console.error('   - URL salah');
    }
  }
}

testWebhook();
