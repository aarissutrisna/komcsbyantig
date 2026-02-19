import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    console.log('Seeding database...');

    const adminPassword = await bcrypt.hash('admin123456', 10);
    const csPassword = await bcrypt.hash('cs123456', 10);

    const [branchRows] = await pool.execute(
      'SELECT id FROM branches WHERE name = ?',
      ['Jakarta']
    );

    let branchId = branchRows[0]?.id;

    if (!branchId) {
      branchId = uuidv4();
      await pool.execute(
        'INSERT INTO branches (id, name, city) VALUES (?, ?, ?)',
        [branchId, 'Jakarta', 'Jakarta']
      );
    }

    await pool.execute(
      'INSERT IGNORE INTO users (id, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'admin@commission.local', adminPassword, 'admin', branchId]
    );

    await pool.execute(
      'INSERT IGNORE INTO users (id, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'hrd@commission.local', adminPassword, 'hrd', branchId]
    );

    await pool.execute(
      'INSERT IGNORE INTO users (id, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), 'cs1@commission.local', csPassword, 'cs', branchId]
    );

    console.log('Database seeded successfully!');
    console.log('');
    console.log('Test accounts:');
    console.log('- Email: admin@commission.local | Password: admin123456 | Role: admin');
    console.log('- Email: hrd@commission.local | Password: admin123456 | Role: hrd');
    console.log('- Email: cs1@commission.local | Password: cs123456 | Role: cs');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
