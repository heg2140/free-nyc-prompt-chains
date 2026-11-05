import Link from "next/link";
import { createChain } from "@/app/chains/actions";
import { ChainForm } from "@/components/chain-form";
import { requireSuperadmin } from "@/lib/auth";
import { card, errorBox, formatDate, h1, h2, muted, page } from "@/lib/ui";

export default async function ChainsPage() {
  const { supabase } = await requireSuperadmin();
  const { data: chains, error } = await supabase
    .from("prompt_chains")
    .select("id, name, description, updated_at, prompt_chain_steps(count), prompt_chain_runs(count)")
    .order("updated_at", { ascending: false });

  return (
    <div className={page}>
      <h1 className={h1}>Prompt chains</h1>
      <p className={`mt-1 ${muted}`}>
        Each chain turns a Free NYC search into suggestions, one model call per step.
      </p>

      {error && (
        <p className={`mt-6 ${errorBox}`}>
          Couldn&apos;t load chains: {error.message}. Has supabase/prompt-chains-setup.sql been run?
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col gap-3">
          {chains?.length === 0 && <p className={muted}>No chains yet. Create one to get started.</p>}
          {chains?.map((chain) => {
            const steps = (chain.prompt_chain_steps as { count: number }[])[0]?.count ?? 0;
            const runs = (chain.prompt_chain_runs as { count: number }[])[0]?.count ?? 0;
            return (
              <Link
                key={chain.id}
                href={`/chains/${chain.id}`}
                className={`${card} block transition-colors hover:border-zinc-400 dark:hover:border-zinc-600`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={h2}>{chain.name}</h2>
                  <span className={muted}>Updated {formatDate(chain.updated_at)}</span>
                </div>
                {chain.description && (
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{chain.description}</p>
                )}
                <p className={`mt-3 ${muted}`}>
                  {steps} {steps === 1 ? "step" : "steps"} · {runs} {runs === 1 ? "run" : "runs"}
                </p>
              </Link>
            );
          })}
        </section>

        <aside className={`${card} h-fit`}>
          <h2 className={`${h2} mb-4`}>New chain</h2>
          <ChainForm action={createChain} submitLabel="Create chain" />
        </aside>
      </div>
    </div>
  );
}
