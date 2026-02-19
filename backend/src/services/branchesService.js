import pool from '../config/database.js';

export const getAllBranches = async () => {
    const [rows] = await pool.execute('SELECT * FROM branches ORDER BY name ASC');
    return rows;
};

export const getBranchById = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM branches WHERE id = ?', [id]);
    return rows[0];
};

export const createBranch = async (branchData) => {
    const { id, name, city, target_min, target_max, n8n_endpoint } = branchData;
    await pool.execute(
        'INSERT INTO branches (id, name, city, target_min, target_max, n8n_endpoint) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, city, target_min, target_max, n8n_endpoint]
    );
    return getBranchById(id);
};
