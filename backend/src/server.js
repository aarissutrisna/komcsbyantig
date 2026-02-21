import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import commissionsRoutes from './routes/commissionsRoutes.js';
import omzetRoutes from './routes/omzetRoutes.js';
import withdrawalsRoutes from './routes/withdrawalsRoutes.js';
import branchesRoutes from './routes/branchesRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import targetRoutes from './routes/targetRoutes.js';
import mutasiRoutes from './routes/mutasiRoutes.js';
import penugasanRoutes from './routes/penugasanRoutes.js';
import stableRoutes from './routes/stableRoutes.js';
import * as schedulerService from './services/schedulerService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy for multi-hop setup (Hardened to trust only WGhub IP)
app.set('trust proxy', '10.40.0.1');

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/omzet', omzetRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/mutasi', mutasiRoutes);
app.use('/api/penugasan', penugasanRoutes);
app.use('/api/stable', stableRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  // Initialize Scheduler
  try {
    await schedulerService.initScheduler();
  } catch (err) {
    console.error('Failed to initialize scheduler:', err);
  }
});
