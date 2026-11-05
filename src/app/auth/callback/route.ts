import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// This is the OAuth redirect target. Google redirects to Supabase's own
// callback, and Supabase then redirects here with a `code` query param,
// which we exchange for a logged-in session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Supabase reports OAuth problems (e.g. a misconfigured provider) here.
  let reason =
    searchParams.get("error_description") ?? searchParams.get("error") ?? "No sign-in code was returned.";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // The proxy sends non-superadmins on to /not-authorized from here.
      return NextResponse.redirect(`${origin}/`);
    }
    reason = error.message;
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`);
}
