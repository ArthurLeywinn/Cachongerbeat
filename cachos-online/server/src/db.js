// db.js — Cliente Supabase (service role). Solo se usa en el servidor.
// NUNCA expongas SUPABASE_SERVICE_KEY al cliente.

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.warn('[db] SUPABASE_URL o SUPABASE_SERVICE_KEY no definidos — modo sin DB activo.');
}

const supabase = url && key ? createClient(url, key) : null;

module.exports = { supabase };
