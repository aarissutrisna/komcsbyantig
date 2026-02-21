import * as authService from '../services/authService.js';
import * as auditService from '../services/auditService.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.loginUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords required' });
    }

    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  try {
    // Support filtering by branchId from query string (used by Dashboard & DataAttendance)
    const branchId = req.query.branchId || null;
    const users = await authService.getAllUsers(branchId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  console.log('Create User Request Body:', req.body);
  try {
    console.log('Calling authService.createUser...');
    const user = await authService.createUser(req.body);
    console.log('User created successfully in DB:', user.id);

    try {
      console.log('Recording audit log...');
      await auditService.recordLog({
        userId: req.user.id,
        action: 'CREATE_USER',
        entity: 'user',
        entityId: user.id,
        ipAddress: req.ip,
        details: { username: user.username, role: user.role, branchId: user.branch_id }
      });
      console.log('Audit log recorded.');
    } catch (auditError) {
      console.error('Audit Log failed but continuing:', auditError.message);
    }

    res.status(201).json(user);
  } catch (error) {
    console.error('Create User Controller ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const user = await authService.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await auditService.recordLog({
      userId: req.user.id,
      action: 'UPDATE_USER',
      entity: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      details: { username: user.username, changes: req.body }
    });

    res.json(user);
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await authService.deleteUser(req.params.id);

    await auditService.recordLog({
      userId: req.user.id,
      action: 'DELETE_USER',
      entity: 'user',
      entityId: req.params.id,
      ipAddress: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const resign = async (req, res) => {
  try {
    const { resign_date } = req.body;
    if (!resign_date) return res.status(400).json({ error: 'resign_date diperlukan' });
    const result = await authService.resignUser(req.params.id, resign_date);
    await auditService.recordLog({
      userId: req.user.id, action: 'RESIGN_USER', entity: 'user',
      entityId: req.params.id, ipAddress: req.ip, details: { resign_date }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reactivate = async (req, res) => {
  try {
    const result = await authService.reactivateUser(req.params.id);
    await auditService.recordLog({
      userId: req.user.id, action: 'REACTIVATE_USER', entity: 'user',
      entityId: req.params.id, ipAddress: req.ip
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
