import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/supabase/config";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open: the login screen and the OAuth return route.
const PUBLIC_PATHS = ["/login", "/auth/callback"];
// Signed in but not a superadmin: may only see this page (and sign out).
const NON_ADMIN_PATHS = ["/not-authorized", "/auth/sign-out"];

function redirectTo(request: NextRequest, pathname: string, from?: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  // Keep any refreshed auth cookies on the redirect.
  from?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

// Refreshes the Supabase auth session on every request, then enforces the
// admin login wall: signed-out users go to /login, and signed-in users who
// aren't superadmins go to /not-authorized.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseConfig().url,
    supabaseConfig().anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove: this refreshes the auth token and must run before any
  // other logic that reads cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  if (NON_ADMIN_PATHS.includes(pathname)) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_superadmin !== true) {
    return redirectTo(request, "/not-authorized", supabaseResponse);
  }

  return supabaseResponse;
}
