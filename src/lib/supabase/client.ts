import { createBrowserClient } from "@supabase/ssr";

// Supabase client for use in Client Components (runs in the browser). The
// URL and public anon key are passed in from the server, which reads them
// from the environment.
export function createClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
