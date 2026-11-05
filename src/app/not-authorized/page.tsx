import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the account has been made a superadmin since it was sent here,
  // reloading this page lets it straight in.
  const { data: profile, error } = user
    ? await supabase.from("profiles").select("is_superadmin").eq("id", user.id).maybeSingle()
    : { data: null, error: null };
  if (profile?.is_superadmin === true) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Not authorized
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        {user?.email ?? "This account"} isn&apos;t a superadmin, so it can&apos;t
        use the prompt chain tool.
      </p>
      {/* What the check actually saw, so a missing row or a blocked read is
          easy to tell apart from a flag that's simply off. */}
      <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-500">
        {error
          ? `Couldn't read this account's profile: ${error.message}`
          : profile
            ? "Profile found, is_superadmin is false."
            : `No readable profile row for user id ${user?.id ?? "unknown"}.`}
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Check again
        </Link>
        <form action="/auth/sign-out" method="post">
          <button className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
