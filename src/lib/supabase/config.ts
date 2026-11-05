// Read on the server. Plain names are preferred (Vercel can store them as
// regular config); the NEXT_PUBLIC_ names still work for local .env files.
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return { url, anonKey };
}
