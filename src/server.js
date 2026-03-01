// src/server.js — QuickTest API Server (Supabase edition)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Supabase client (exits if env vars missing)
require('../db/supabase');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : true; // allow all in dev

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ── Serve frontend (production) ───────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/tests',       require('./routes/tests'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/decks',       require('./routes/decks'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── SPA fallback (serve index.html for all non-API routes) ───────────────────
if (fs.existsSync(frontendPath)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀  QuickTest running!');
  console.log(`    http://localhost:${PORT}`);
  console.log(`    API: http://localhost:${PORT}/api/health`);
  console.log('');
});

module.exports = app;
