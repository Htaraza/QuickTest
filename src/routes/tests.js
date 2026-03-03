// src/routes/tests.js
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
    const { data } = await supabase.from('tests').select('id').eq('code', code).maybeSingle();
    exists = !!data;
  } while (exists);
  return code;
}

async function buildTest(testRow) {
  if (!testRow) return null;
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testRow.id)
    .order('sort_order');

  return {
    id: testRow.id,
    teacherId: testRow.teacher_id,
    title: testRow.title,
    description: testRow.description,
    inApp: testRow.in_app,
    allowCalculator: testRow.allow_calculator || false,   // ← ADDED
    code: testRow.code,
    status: testRow.status,
    createdAt: new Date(testRow.created_at).getTime(),
    updatedAt: new Date(testRow.updated_at).getTime(),
    questions: (questions || []).map(q => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.points,
      options: q.options || [],
      correctAnswers: q.correct_answers || [],
      required: q.required !== false
    }))
  };
}

// GET /api/tests
router.get('/', authMiddleware, async (req, res) => {
  const { data: rows, error } = await supabase
    .from('tests').select('*').eq('teacher_id', req.teacher.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const tests = await Promise.all((rows || []).map(buildTest));
  res.json({ tests });
});

// GET /api/tests/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { data: row } = await supabase.from('tests').select('*')
    .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Test not found' });
  res.json({ test: await buildTest(row) });
});

// POST /api/tests
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description = '',
      inApp = true,
      allowCalculator = false,               // ← ADDED
      questions = [],
      status = 'draft'
    } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const code = await uniqueCode();
    const { data: test, error } = await supabase.from('tests')
      .insert({
        teacher_id: req.teacher.id,
        title: title.trim(),
        description: description.trim(),
        in_app: inApp,
        allow_calculator: allowCalculator,   // ← ADDED
        code,
        status
      })
      .select().single();
    if (error) throw error;

    if (questions.length > 0) {
      const { error: qErr } = await supabase.from('questions').insert(
        questions.map((q, i) => ({
          id: q.id || uuidv4(),
          test_id: test.id,
          sort_order: i,
          type: q.type,
          text: q.text || '',
          points: q.points || 1,
          options: q.options || [],
          correct_answers: q.correctAnswers || [],
          required: q.required !== false
        }))
      );
      if (qErr) throw qErr;
    }

    res.status(201).json({ test: await buildTest(test) });
  } catch (err) {
    console.error('Create test:', err);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// PUT /api/tests/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('tests').select('*')
      .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Test not found' });

    const { title, description, inApp, allowCalculator, questions, status, code } = req.body;

    // Check code uniqueness if changing
    if (code && code !== existing.code) {
      const { data: taken } = await supabase.from('tests').select('id').eq('code', code).neq('id', existing.id).maybeSingle();
      if (taken) return res.status(409).json({ error: 'Code already in use' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (inApp !== undefined) updates.in_app = inApp;
    if (allowCalculator !== undefined) updates.allow_calculator = allowCalculator;  // ← ADDED
    if (status !== undefined) updates.status = status;
    if (code !== undefined) updates.code = code;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('tests').update(updates).eq('id', existing.id);
    if (error) throw error;

    if (questions !== undefined) {
      await supabase.from('questions').delete().eq('test_id', existing.id);
      if (questions.length > 0) {
        const { error: qErr } = await supabase.from('questions').insert(
          questions.map((q, i) => ({
            id: q.id || uuidv4(),
            test_id: existing.id,
            sort_order: i,
            type: q.type,
            text: q.text || '',
            points: q.points || 1,
            options: q.options || [],
            correct_answers: q.correctAnswers || [],
            required: q.required !== false
          }))
        );
        if (qErr) throw qErr;
      }
    }

    const { data: updated } = await supabase.from('tests').select('*').eq('id', existing.id).single();
    res.json({ test: await buildTest(updated) });
  } catch (err) {
    console.error('Update test:', err);
    res.status(500).json({ error: 'Failed to update test' });
  }
});

// DELETE /api/tests/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { data: row } = await supabase.from('tests').select('id')
    .eq('id', req.params.id).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Test not found' });
  await supabase.from('questions').delete().eq('test_id', req.params.id); // ← clean up questions too
  await supabase.from('tests').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// GET /api/tests/by-code/:code — student access (no auth)
router.get('/by-code/:code', async (req, res) => {
  const { data: row } = await supabase.from('tests').select('*')
    .eq('code', req.params.code.toUpperCase()).eq('status', 'active').maybeSingle();
  if (!row) return res.status(404).json({ error: 'Invalid or inactive test code' });

  const test = await buildTest(row);
  // Strip correct answers for student but keep all other fields
  res.json({
    test: {
      ...test,
      questions: test.questions.map(({ correctAnswers, ...rest }) => rest)  // ← keeps id, type, text, points, options
    }
  });
});

module.exports = router;
