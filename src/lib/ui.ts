// Shared Tailwind class strings so every page looks the same.
export const card =
  "rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-900";
export const input =
  "w-full rounded-lg border border-black/[.12] bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/[.15] dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-300";
export const label = "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
export const primaryButton =
  "rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
export const secondaryButton =
  "rounded-full border border-black/[.12] px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-white/[.15] dark:text-zinc-300 dark:hover:bg-zinc-800";
export const muted = "text-sm text-zinc-500 dark:text-zinc-400";
export const h1 = "text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";
export const h2 = "text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";
export const page = "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6";
export const errorBox =
  "rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
