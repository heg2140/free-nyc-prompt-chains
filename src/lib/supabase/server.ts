import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/supabase/config";
import { cookies } from "next/headers";

// Supabase client for use in Server Components, Route Handlers, and
// Server Actions (runs on the server, reads/writes the auth cookie).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseConfig().url,
    supabaseConfig().anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component. This can be
            // ignored if middleware is refreshing user sessions.
          }
        },
      },
    }
  );
}
