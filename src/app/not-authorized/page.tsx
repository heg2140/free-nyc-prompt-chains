import { createClient } from "@/lib/supabase/server";

export default async function NotAuthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Not authorized
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        {user?.email ?? "This account"} isn&apos;t a superadmin, so it can&apos;t
        use the prompt chain tool.
      </p>
      <form action="/auth/sign-out" method="post">
        <button className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100">
          Sign out
        </button>
      </form>
    </div>
  );
}
