import '../config/env.js';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import fetch from 'node-fetch';

async function run() {
  try {
    // 1. Get a valid user from the database
    const [users] = await pool.execute('SELECT id, email, role FROM users LIMIT 1');
    if (users.length === 0) {
      console.error('No users found in database.');
      return;
    }
    const user = users[0];
    console.log('Using user:', user);

    // 2. Generate a valid JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Create a temporary claim to delete
    console.log('Creating a temporary claim...');
    const [insertResult] = await pool.execute(
      `INSERT INTO bonus_transfer_claims 
        (keterangan, start_date, end_date, direction, pembagi, pengali, total_nilai, bonus_amount, item_count, created_by_id, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Test Claim Deletion', '2026-06-01', '2026-06-15', 'All', 10000000, 5000, 50000000, 25000, 5, user.id, 'Test User']
    );
    const claimId = insertResult.insertId;
    console.log('Temporary claim created with ID:', claimId);

    // 4. Send DELETE request to the API
    const url = `http://localhost:${process.env.PORT || 3000}/api/bonus-claims/${claimId}`;
    console.log('Sending DELETE request to:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response JSON:', data);

  } catch (err) {
    console.error('Error during API test:', err);
  } finally {
    await pool.end();
  }
}
run();
