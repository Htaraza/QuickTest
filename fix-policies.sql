-- Run this in Supabase SQL Editor if you get the "policy already exists" error
-- It drops the old policies and recreates them — your tables and data are untouched

DROP POLICY IF EXISTS "block_all_teachers"    ON teachers;
DROP POLICY IF EXISTS "block_all_tests"       ON tests;
DROP POLICY IF EXISTS "block_all_questions"   ON questions;
DROP POLICY IF EXISTS "block_all_submissions" ON submissions;
DROP POLICY IF EXISTS "block_all_decks"       ON decks;
DROP POLICY IF EXISTS "block_all_flashcards"  ON flashcards;

CREATE POLICY "block_all_teachers"    ON teachers    FOR ALL USING (false);
CREATE POLICY "block_all_tests"       ON tests       FOR ALL USING (false);
CREATE POLICY "block_all_questions"   ON questions   FOR ALL USING (false);
CREATE POLICY "block_all_submissions" ON submissions FOR ALL USING (false);
CREATE POLICY "block_all_decks"       ON decks       FOR ALL USING (false);
CREATE POLICY "block_all_flashcards"  ON flashcards  FOR ALL USING (false);
