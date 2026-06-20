import * as bonusClaimsService from '../services/bonusClaimsService.js';
import pool from '../config/database.js';

export const getClaims = async (req, res) => {
  try {
    const claims = await bonusClaimsService.getAllClaims();
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getClaimedIds = async (req, res) => {
  try {
    const list = await bonusClaimsService.getClaimedNotransaksiList();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getClaimDetail = async (req, res) => {
  try {
    const claim = await bonusClaimsService.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Klaim tidak ditemukan.' });
    }
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createClaim = async (req, res) => {
  try {
    const {
      keterangan,
      startDate,
      endDate,
      direction,
      pembagi,
      pengali,
      totalNilai,
      bonusAmount,
      items
    } = req.body;

    if (!keterangan || keterangan.trim() === '') {
      return res.status(400).json({ error: 'Keterangan klaim wajib diisi.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal satu item transaksi harus dipilih.' });
    }

    // Ambil nama user pembuat klaim
    const [userRows] = await pool.execute(
      'SELECT nama FROM users WHERE id = ?',
      [req.user.id]
    );
    const createdByName = userRows[0]?.nama || 'Unknown';

    const result = await bonusClaimsService.createClaim({
      keterangan: keterangan.trim(),
      startDate,
      endDate,
      direction,
      pembagi,
      pengali,
      totalNilai,
      bonusAmount,
      items,
      createdById: req.user.id,
      createdByName
    });

    res.status(201).json({
      success: true,
      message: 'Klaim bonus berhasil disimpan.',
      claimId: result.claimId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClaim = async (req, res) => {
  try {
    const success = await bonusClaimsService.deleteClaim(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Klaim tidak ditemukan atau sudah dihapus.' });
    }
    res.json({ success: true, message: 'Klaim bonus berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
