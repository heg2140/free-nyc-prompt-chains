import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST-only so a link or prefetch can't sign someone out by accident.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
