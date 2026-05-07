const app = require('./app');
const env = require('./config/env');

// No need for require('./config/db') — Supabase connects automatically

app.listen(env.port, () => {
  console.log(`🚀 Server on http://localhost:${env.port}`);
  console.log(`📦 Environment: ${env.nodeEnv}`);
  console.log(`🟢 Supabase: ${env.supabase.url}`);
});