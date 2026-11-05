import type { Suggestion } from "@/lib/chain";

export function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.1] dark:bg-zinc-950">
      <span className="w-fit rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {suggestion.neighborhood}
      </span>
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{suggestion.title}</h3>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{suggestion.description}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">🚇 {suggestion.transit_directions}</p>
    </article>
  );
}
