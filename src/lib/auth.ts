import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every admin page and server action calls this, even though the proxy
// already guards each route: server actions can be called directly, so the
// check has to live next to the data access too.
export async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_superadmin !== true) {
    redirect("/not-authorized");
  }

  return { supabase, user, profile };
}
