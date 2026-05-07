// Load environment variables from .env
require('dotenv').config();

// Required variables — fewer and simpler now
const required = [
  'SUPABASE_URL',

  'SUPABASE_ANON_KEY',

  'SUPABASE_SERVICE_ROLE_KEY',

];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {

    url:            process.env.SUPABASE_URL,

    anonKey:        process.env.SUPABASE_ANON_KEY,

    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  },

};