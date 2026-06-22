import '../config/env.js';
import jwt from 'jsonwebtoken';
import http from 'http';
import pool from '../config/database.js';

const token = jwt.sign(
  {
    id: '9a704200-10cf-11f1-9ee8-0200170038e6',
    email: 'aris@example.com',
    role: 'admin',
    branchId: 'UTM'
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function testEndpoint(method, path, body) {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('Updating n8n_debt_secret in DB to use correct secret VTAFwFNCZn9kS...');
    await pool.execute(
      `UPDATE branches SET n8n_debt_secret = 'VTAFwFNCZn9kS' WHERE id IN ('UTM', 'JTJ')`
    );
    await pool.execute(
      `UPDATE finance_group_settings SET webhook_secret = 'VTAFwFNCZn9kS' 
       WHERE finance_group_key = '44b8b27a80f31cd372e63b7159c1739930f829761e1658a2b2257ca787018b73'`
    );
    console.log('✅ DB updated successfully.');

    const groupKey = '44b8b27a80f31cd372e63b7159c1739930f829761e1658a2b2257ca787018b73';

    console.log(`\n--- Testing POST /api/finance/analysis-runs/${groupKey} ---`);
    const runRes = await testEndpoint('POST', `/api/finance/analysis-runs/${groupKey}`, {
      run_label: 'Test Run with Correct Secret',
      cash_amount: 60000000
    });
    console.log('Status:', runRes.statusCode);
    console.log('Body:', runRes.body);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
