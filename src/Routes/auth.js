// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../db/supabase');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function makeToken(teacher) {
  return jwt.sign(
    { id: teacher.id, email: teacher.email, name: teacher.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, password, and name are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ error: 'Invalid email address' });

    // Check existing
    const { data: existing } = await supabase
      .from('teachers').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (existing)
      return res.status(409).json({ error: 'An account with that email already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({ email: email.toLowerCase(), password: hashed, name: name.trim() })
      .select('id, email, name, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ token: makeToken(teacher), teacher: { id: teacher.id, email: teacher.email, name: teacher.name } });
  } catch (err) {
    console.error('Register:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const { data: teacher } = await supabase
      .from('teachers').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (!teacher)
      return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, teacher.password);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ token: makeToken(teacher), teacher: { id: teacher.id, email: teacher.email, name: teacher.name } });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: teacher } = await supabase
    .from('teachers').select('id, email, name, created_at').eq('id', req.teacher.id).maybeSingle();
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  res.json({ teacher });
});

module.exports = router;
