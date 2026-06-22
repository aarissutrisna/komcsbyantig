import '../config/env.js';
import jwt from 'jsonwebtoken';
import http from 'http';

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
  console.log('\n--- Testing GET /api/finance/groups ---');
  const groupsRes = await testEndpoint('GET', '/api/finance/groups');
  console.log(groupsRes);

  const groupKey = '44b8b27a80f31cd372e63b7159c1739930f829761e1658a2b2257ca787018b73'; // UTM & JTJ

  console.log(`\n--- Testing GET /api/finance/analysis-runs/${groupKey} ---`);
  const historyRes = await testEndpoint('GET', `/api/finance/analysis-runs/${groupKey}`);
  console.log(historyRes);

  console.log(`\n--- Testing POST /api/finance/analysis-runs/${groupKey} ---`);
  const runRes = await testEndpoint('POST', `/api/finance/analysis-runs/${groupKey}`, {
    run_label: 'Test Run via script',
    cash_amount: 50000000
  });
  console.log(runRes);
}

run();
