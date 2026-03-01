// db/supabase.js — Supabase client (service role for full DB access)
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('    Copy .env.example → .env and fill in your Supabase project credentials.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

console.log('✅  Supabase client initialized');
module.exports = supabase;
