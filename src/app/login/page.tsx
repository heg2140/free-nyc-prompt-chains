import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Free NYC
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Prompt chain tool
      </h1>
      <p className="max-w-sm text-center text-zinc-600 dark:text-zinc-400">
        Only Free NYC superadmins can use this tool.
      </p>
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Sign-in failed{typeof error === "string" && error !== "1" ? `: ${error}` : "."} Please try again.
        </p>
      )}
      <GoogleSignInButton
        supabaseUrl={supabaseConfig().url}
        supabaseAnonKey={supabaseConfig().anonKey}
      />
    </div>
  );
}
