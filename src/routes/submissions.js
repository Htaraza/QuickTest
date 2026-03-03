// src/routes/submissions.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../../db/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function gradeSubmission(questions, answers) {
  return answers.map((a, i) => {
    const q = questions[i];
    if (!q) return { ...a, autoScore: 0 };
    let autoScore = 0;
    const correct = q.correct_answers || [];

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      // Case-insensitive + trimmed (original was strict === which broke on whitespace/case)
      const given = (a.value || '').trim().toLowerCase();
      const expected = (correct[0] || '').trim().toLowerCase();
      if (expected && given === expected) autoScore = q.points;

    } else if (q.type === 'multiple_select') {
      const cSet = new Set(correct.map(x => x.trim().toLowerCase()));
      const gSet = new Set((Array.isArray(a.value) ? a.value : []).map(x => x.trim().toLowerCase()));
      if (cSet.size > 0 && [...cSet].every(c => gSet.has(c)) && [...gSet].every(g => cSet.has(g)))
        autoScore = q.points;

    } else if (q.type === 'short_answer') {
      const given = (a.value || '').toLowerCase().trim();
      const accepted = correct.map(x => x.toLowerCase().trim());
      if (accepted.length > 0 && accepted.includes(given))
        autoScore = q.points;

    } else if (q.type === 'math') {
      // ── THIS WAS MISSING — math always got autoScore 0 before ──
      const given = (a.value || '').trim();
      const accepted = correct.map(x => x.trim());
      if (accepted.length > 0) {
        // Exact case-insensitive match (handles expressions like "x+1", "2x")
        const exactMatch = accepted.some(x => x.toLowerCase() === given.toLowerCase());
        // Numeric equivalence: "4" matches "4.0", "4.00", ".5" matches "0.5"
        const givenNum = parseFloat(given);
        const numericMatch = given !== '' && !isNaN(givenNum) && accepted.some(x => {
          const xNum = parseFloat(x);
          return !isNaN(xNum) && Math.abs(givenNum - xNum) < 0.0001;
        });
        if (exactMatch || numericMatch) autoScore = q.points;
      }
    }
    // essay: autoScore stays 0 — teacher grades manually

    return { ...a, autoScore };
  });
}

// POST /api/submissions
router.post('/', async (req, res) => {
  try {
    const { testId, studentEmail, answers = [], invalidated = false } = req.body;
    if (!testId || !studentEmail) return res.status(400).json({ error: 'testId and studentEmail are required' });

    const email = studentEmail.toLowerCase().trim();

    // Check existing submission
    const { data: existing } = await supabase.from('submissions').select('*')
      .eq('test_id', testId).eq('student_email', email).maybeSingle();
    if (existing && !existing.retake_allowed)
      return res.status(409).json({ error: 'Already submitted. Contact teacher to retake.' });

    // Fetch full questions including correct_answers (students never receive these directly)
    const { data: questions } = await supabase.from('questions').select('*')
      .eq('test_id', testId).order('sort_order');

    const totalPoints = (questions || []).reduce((s, q) => s + q.points, 0);
    let gradedAnswers = answers;
    let totalScore = 0;
    let percentage = 0;

    if (!invalidated && answers.length > 0) {
      gradedAnswers = gradeSubmission(questions || [], answers);
      totalScore = gradedAnswers.reduce((s, a) => s + (a.autoScore || 0), 0);
      percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
    }

    let result;
    if (existing) {
      const { data } = await supabase.from('submissions')
        .update({
          answers: gradedAnswers, total_score: totalScore, total_points: totalPoints,
          percentage, invalidated, retake_allowed: false,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existing.id).select().single();
      result = data;
    } else {
      const { data } = await supabase.from('submissions')
        .insert({
          test_id: testId, student_email: email, answers: gradedAnswers,
          total_score: totalScore, total_points: totalPoints,
          percentage, invalidated, retake_allowed: false
        })
        .select().single();
      result = data;
    }

    // Return graded answers so the frontend can show correct/incorrect per question
    res.status(201).json({ success: true, totalScore, totalPoints, percentage, answers: gradedAnswers });
  } catch (err) {
    console.error('Submit:', err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// GET /api/submissions/check
router.get('/check', async (req, res) => {
  const { testId, email } = req.query;
  if (!testId || !email) return res.status(400).json({ error: 'testId and email required' });
  const { data } = await supabase.from('submissions').select('retake_allowed, invalidated')
    .eq('test_id', testId).eq('student_email', email.toLowerCase()).maybeSingle();
  res.json({ exists: !!data, retakeAllowed: !!data?.retake_allowed, invalidated: !!data?.invalidated });
});

// GET /api/submissions/test/:testId — teacher only
router.get('/test/:testId', authMiddleware, async (req, res) => {
  const { data: test } = await supabase.from('tests').select('id')
    .eq('id', req.params.testId).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const { data: subs } = await supabase.from('submissions').select('*')
    .eq('test_id', req.params.testId).order('submitted_at', { ascending: false });

  res.json({
    submissions: (subs || []).map(s => ({
      id: s.id,
      email: s.student_email,
      answers: s.answers,
      totalScore: s.total_score,
      totalPoints: s.total_points,
      percentage: s.percentage,
      invalidated: s.invalidated,
      retakeAllowed: s.retake_allowed,
      submittedAt: new Date(s.submitted_at).getTime()
    }))
  });
});

// PATCH /api/submissions/:id/grade — teacher manually grades essay/unkeyed questions
router.patch('/:id/grade', authMiddleware, async (req, res) => {
  try {
    const { data: sub } = await supabase.from('submissions').select('*').eq('id', req.params.id).maybeSingle();
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const { data: test } = await supabase.from('tests').select('id')
      .eq('id', sub.test_id).eq('teacher_id', req.teacher.id).maybeSingle();
    if (!test) return res.status(403).json({ error: 'Not authorized' });

    const { questionIndex, score } = req.body;
    const answers = [...(sub.answers || [])];
    if (questionIndex < 0 || questionIndex >= answers.length)
      return res.status(400).json({ error: 'Invalid question index' });

    answers[questionIndex] = { ...answers[questionIndex], manualScore: score, graded: true };

    const { data: questions } = await supabase.from('questions').select('points').eq('test_id', sub.test_id);
    const totalPoints = (questions || []).reduce((s, q) => s + q.points, 0);
    const totalScore = answers.reduce((s, a) => s + (a.manualScore !== undefined ? a.manualScore : (a.autoScore || 0)), 0);
    const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

    await supabase.from('submissions').update({ answers, total_score: totalScore, percentage }).eq('id', sub.id);
    res.json({ success: true, totalScore, totalPoints, percentage, answers });
  } catch (err) {
    console.error('Grade:', err);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// PATCH /api/submissions/:id/retake — teacher allows student to retake
router.patch('/:id/retake', authMiddleware, async (req, res) => {
  const { data: sub } = await supabase.from('submissions').select('*').eq('id', req.params.id).maybeSingle();
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  const { data: test } = await supabase.from('tests').select('id')
    .eq('id', sub.test_id).eq('teacher_id', req.teacher.id).maybeSingle();
  if (!test) return res.status(403).json({ error: 'Not authorized' });

  await supabase.from('submissions').update({ retake_allowed: true }).eq('id', sub.id);
  res.json({ success: true });
});

module.exports = router;
