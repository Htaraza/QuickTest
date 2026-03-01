-- ═══════════════════════════════════════════════════════════════════════════
-- QuickTest — Supabase Schema (safe to re-run)
-- Run this in: supabase.com → your project → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Drop existing policies (safe if they don't exist) ────────────────────
DROP POLICY IF EXISTS "block_all_teachers"    ON teachers;
DROP POLICY IF EXISTS "block_all_tests"       ON tests;
DROP POLICY IF EXISTS "block_all_questions"   ON questions;
DROP POLICY IF EXISTS "block_all_submissions" ON submissions;
DROP POLICY IF EXISTS "block_all_decks"       ON decks;
DROP POLICY IF EXISTS "block_all_flashcards"  ON flashcards;

-- ── Tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  in_app      BOOLEAN NOT NULL DEFAULT TRUE,
  code        TEXT UNIQUE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  type            TEXT NOT NULL CHECK (type IN ('multiple_choice','multiple_select','true_false','short_answer','essay')),
  text            TEXT NOT NULL,
  points          INTEGER NOT NULL DEFAULT 1,
  options         JSONB NOT NULL DEFAULT '[]',
  correct_answers JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_email   TEXT NOT NULL,
  answers         JSONB NOT NULL DEFAULT '[]',
  total_score     INTEGER NOT NULL DEFAULT 0,
  total_points    INTEGER NOT NULL DEFAULT 0,
  percentage      INTEGER NOT NULL DEFAULT 0,
  invalidated     BOOLEAN NOT NULL DEFAULT FALSE,
  retake_allowed  BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(test_id, student_email)
);

CREATE TABLE IF NOT EXISTS decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  code        TEXT UNIQUE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  hint        TEXT NOT NULL DEFAULT ''
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tests_teacher     ON tests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tests_code        ON tests(code);
CREATE INDEX IF NOT EXISTS idx_tests_status      ON tests(status);
CREATE INDEX IF NOT EXISTS idx_questions_test    ON questions(test_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_submissions_test  ON submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(student_email);
CREATE INDEX IF NOT EXISTS idx_decks_teacher     ON decks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_decks_code        ON decks(code);
CREATE INDEX IF NOT EXISTS idx_cards_deck        ON flashcards(deck_id, sort_order);

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE teachers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_all_teachers"    ON teachers    FOR ALL USING (false);
CREATE POLICY "block_all_tests"       ON tests       FOR ALL USING (false);
CREATE POLICY "block_all_questions"   ON questions   FOR ALL USING (false);
CREATE POLICY "block_all_submissions" ON submissions FOR ALL USING (false);
CREATE POLICY "block_all_decks"       ON decks       FOR ALL USING (false);
CREATE POLICY "block_all_flashcards"  ON flashcards  FOR ALL USING (false);
