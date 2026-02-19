import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getAllBranches = async () => {
    const [rows] = await pool.execute('SELECT * FROM branches ORDER BY name ASC');
    return rows;
};

export const getBranchById = async (id) => {
    const [rows] = await pool.execute('SELECT * FROM branches WHERE id = ?', [id]);
    return rows[0];
};

export const createBranch = async (branchData) => {
    const { name, city, target_min, target_max, n8n_endpoint } = branchData;
    const id = uuidv4();
    await pool.execute(
        'INSERT INTO branches (id, name, city, target_min, target_max, n8n_endpoint) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, city, target_min, target_max, n8n_endpoint]
    );
    return getBranchById(id);
};

export const updateBranch = async (id, branchData) => {
    const { name, city, target_min, target_max, n8n_endpoint } = branchData;
    await pool.execute(
        'UPDATE branches SET name = ?, city = ?, target_min = ?, target_max = ?, n8n_endpoint = ? WHERE id = ?',
        [name, city, target_min, target_max, n8n_endpoint, id]
    );
    return getBranchById(id);
};

export const deleteBranch = async (id) => {
    await pool.execute('DELETE FROM branches WHERE id = ?', [id]);
    return { success: true };
};
