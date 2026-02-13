import bcrypt from 'bcrypt';
import pool from '../config/database.js';

async function seed() {
  try {
    console.log('Seeding database...');

    const adminPassword = await bcrypt.hash('admin123456', 10);
    const csPassword = await bcrypt.hash('cs123456', 10);

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE name = $1',
      ['Jakarta']
    );

    let branchId = branchResult.rows[0]?.id;

    if (!branchId) {
      const newBranch = await pool.query(
        'INSERT INTO branches (name, city) VALUES ($1, $2) RETURNING id',
        ['Jakarta', 'Jakarta']
      );
      branchId = newBranch.rows[0].id;
    }

    await pool.query(
      'INSERT INTO users (email, password, role, branch_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['admin@commission.local', adminPassword, 'admin', branchId]
    );

    await pool.query(
      'INSERT INTO users (email, password, role, branch_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['hrd@commission.local', adminPassword, 'hrd', branchId]
    );

    await pool.query(
      'INSERT INTO users (email, password, role, branch_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['cs1@commission.local', csPassword, 'cs', branchId]
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
