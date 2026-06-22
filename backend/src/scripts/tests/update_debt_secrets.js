import mysql from 'mysql2/promise';

async function updateSecrets() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'kuda4000',
    database: 'cs_commission'
  });

  console.log(' Updating n8n_debt_secret...');
  
  // UTM & JTJ use the same secret
  await conn.execute(
    `UPDATE branches SET n8n_debt_secret = 'VTAFwFNCZn9kS' WHERE id IN ('UTM', 'JTJ')`
  );
  console.log('✅ Updated UTM & JTJ');
  
  // TSM uses different secret
  await conn.execute(
    `UPDATE branches SET n8n_debt_secret = 'ieTReHNxKyJw7z' WHERE id = 'TSM'`
  );
  console.log('✅ Updated TSM');
  
  // Verify
  const [branches] = await conn.execute(
    'SELECT id, n8n_debt_endpoint, n8n_debt_secret FROM branches'
  );
  
  console.log('\n📊 Current setup:');
  branches.forEach(b => {
    console.log(`  ${b.id.padEnd(5)} | ${b.n8n_debt_secret || 'NULL'} | ${b.n8n_debt_endpoint || 'NULL'}`);
  });
  
  await conn.end();
  console.log('\n✅ Done!');
}

updateSecrets().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
