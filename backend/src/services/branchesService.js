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
    const { id, name, city, target_min, target_max, n8n_endpoint, n8n_secret, comm_perc_min, comm_perc_max } = branchData;
    const branchId = id || uuidv4();
    await pool.execute(
        'INSERT INTO branches (id, name, city, target_min, target_max, n8n_endpoint, n8n_secret, comm_perc_min, comm_perc_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [branchId, name, city, target_min, target_max, n8n_endpoint, n8n_secret || null, comm_perc_min || 0.20, comm_perc_max || 0.40]
    );
    return getBranchById(branchId);
};

export const updateBranch = async (id, branchData) => {
    const { name, city, target_min, target_max, n8n_endpoint, n8n_secret, comm_perc_min, comm_perc_max } = branchData;
    await pool.execute(
        'UPDATE branches SET name = ?, city = ?, target_min = ?, target_max = ?, n8n_endpoint = ?, n8n_secret = ?, comm_perc_min = ?, comm_perc_max = ? WHERE id = ?',
        [name, city, target_min, target_max, n8n_endpoint, n8n_secret || null, comm_perc_min, comm_perc_max, id]
    );
    return getBranchById(id);
};

export const deleteBranch = async (id) => {
    await pool.execute('DELETE FROM branches WHERE id = ?', [id]);
    return { success: true };
};
