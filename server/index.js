import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import matchRoutes from './routes/matches.js';
import playerRoutes from './routes/players.js';
import teamRoutes from './routes/teams.js';
import syncRoutes from './routes/sync.js';

import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Expose Socket.IO instance to routes/controllers
app.set('io', io);

// Room connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join_match', (matchId) => {
    console.log(`Client ${socket.id} joining match room: ${matchId}`);
    socket.join(matchId);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/matches', matchRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── DB + Server ─────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    httpServer.listen(PORT, () => console.log(`🏏 CrickArena API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
