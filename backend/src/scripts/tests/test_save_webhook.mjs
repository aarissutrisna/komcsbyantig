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
  console.log('\n--- Testing PUT /api/branches/UTM/debt-webhook ---');
  const putRes = await testEndpoint('PUT', '/api/branches/UTM/debt-webhook', {
    n8n_debt_endpoint: 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm',
    n8n_debt_secret: 'test-secret'
  });
  console.log('Status:', putRes.statusCode);
  console.log('Content-Type:', putRes.headers?.['content-type']);
  console.log('Body:', putRes.body);
}

run();
