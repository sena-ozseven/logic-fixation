// ── Supabase Configuration ────────────────────────────────────────────────────
// After creating your project at https://supabase.com/dashboard, replace the
// two placeholder strings below with your real values.
// Find them at: Project Settings → API → Project URL & anon/public key
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

// supabase global is provided by the CDN <script> loaded before this file.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
