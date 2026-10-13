const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n[Supabase] Missing credentials. backend/.env needs SUPABASE_URL and\n" +
    "[Supabase] SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API -> Keys).\n" +
    "[Supabase] The anon key will NOT work here - it is blocked by row level security.\n"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = supabase;
