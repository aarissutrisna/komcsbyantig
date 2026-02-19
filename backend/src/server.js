import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import commissionsRoutes from './routes/commissionsRoutes.js';
import omzetRoutes from './routes/omzetRoutes.js';
import withdrawalsRoutes from './routes/withdrawalsRoutes.js';

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
