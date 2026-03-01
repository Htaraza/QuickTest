// src/routes/decks.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../../db/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode() {
  let code, exists;
  do {
    code = generateCode();
    const { data } = await supabase.from('decks').select('id').eq('code', code).maybeSingle();
    exists = !!data;
  } while (exists);
  return code;
}

async function buildDeck(row) {
  if (!row) return null;
  const { data: cards } = await supabase.from('flashcards').select('*')
    .eq('deck_id', row.id).order('sort_order');
  return {
    id: row.id,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description,
    code: row.code,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    cards: (cards || []).map(c => ({ id: c.id, front: c.front, back: c.back, hint: c.hint }))
  };
}

// GET /api/decks
router.get('/', authMiddleware, async (req, res) => {
  const { data: rows } = await supabase.from('decks').select('*')
    .eq('teacher_id', req.teacher.id).order('created_at', { ascending: false });
  const decks = await Promise.all((rows || []).map(buildDeck));
  res.json({ decks });
});

// GET /api/decks/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { data: row } = await supabase.from('decks').select('*')
    .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Deck not found' });
  res.json({ deck: await buildDeck(row) });
});

// POST /api/decks
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description = '', cards = [], status = 'inactive' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const code = await uniqueCode();
    const { data: deck, error } = await supabase.from('decks')
      .insert({ teacher_id: req.teacher.id, title: title.trim(), description: description.trim(), code, status })
      .select().single();
    if (error) throw error;

    if (cards.length > 0) {
      await supabase.from('flashcards').insert(
        cards.map((c, i) => ({ id: c.id || uuidv4(), deck_id: deck.id, sort_order: i, front: c.front, back: c.back, hint: c.hint || '' }))
      );
    }

    res.status(201).json({ deck: await buildDeck(deck) });
  } catch (err) {
    console.error('Create deck:', err);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// PUT /api/decks/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('decks').select('*')
      .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Deck not found' });

    const { title, description, cards, status, code } = req.body;

    if (code && code !== existing.code) {
      const { data: taken } = await supabase.from('decks').select('id').eq('code', code).neq('id', existing.id).maybeSingle();
      if (taken) return res.status(409).json({ error: 'Code already in use' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (code !== undefined) updates.code = code;

    await supabase.from('decks').update(updates).eq('id', existing.id);

    if (cards !== undefined) {
      await supabase.from('flashcards').delete().eq('deck_id', existing.id);
      if (cards.length > 0) {
        await supabase.from('flashcards').insert(
          cards.map((c, i) => ({ id: c.id || uuidv4(), deck_id: existing.id, sort_order: i, front: c.front, back: c.back, hint: c.hint || '' }))
        );
      }
    }

    const { data: updated } = await supabase.from('decks').select('*').eq('id', existing.id).single();
    res.json({ deck: await buildDeck(updated) });
  } catch (err) {
    console.error('Update deck:', err);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// DELETE /api/decks/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { data: row } = await supabase.from('decks').select('id')
    .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Deck not found' });
  await supabase.from('decks').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// GET /api/decks/by-code/:code — student (no auth)
router.get('/by-code/:code', async (req, res) => {
  const { data: row } = await supabase.from('decks').select('*')
    .eq('code', req.params.code.toUpperCase()).eq('status', 'active').maybeSingle();
  if (!row) return res.status(404).json({ error: 'Invalid or inactive deck code' });
  res.json({ deck: await buildDeck(row) });
});

module.exports = router;
