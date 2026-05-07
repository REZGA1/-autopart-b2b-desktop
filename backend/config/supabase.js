const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Validate environment variables
if (!env.supabase.url || !env.supabase.anonKey || !env.supabase.serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', env.supabase.url ? '✓' : '✗');
  console.error('SUPABASE_ANON_KEY:', env.supabase.anonKey ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', env.supabase.serviceRoleKey ? '✓' : '✗');
}

// Public client — subject to RLS — for Auth only
const supabase = createClient(
  env.supabase.url,
  env.supabase.anonKey
);

// Admin client — bypasses RLS — server-side only!
// ⚠️  Never send serviceRoleKey to the Frontend
const supabaseAdmin = createClient(
  env.supabase.url,
  env.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
);

console.log('✅ Supabase clients initialized');

module.exports = { supabase, supabaseAdmin };