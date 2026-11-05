import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteChain, deleteStep, duplicateChain, moveStep, updateChain } from "@/app/chains/actions";
import { ChainForm } from "@/components/chain-form";
import { DeleteButton } from "@/components/delete-button";
import { RunForm } from "@/components/run-form";
import { StepControls } from "@/components/step-controls";
import { requireSuperadmin } from "@/lib/auth";
import { parseId, variableProblems, type Chain, type Step } from "@/lib/chain";
import { card, h1, h2, muted, page, primaryButton, secondaryButton } from "@/lib/ui";

export default async function ChainPage({ params }: PageProps<"/chains/[id]">) {
  const chainId = parseId((await params).id);
  if (!chainId) notFound();

  const { supabase } = await requireSuperadmin();
  const [{ data: chain }, { data: steps }, { count: runCount }] = await Promise.all([
    supabase.from("prompt_chains").select("*").eq("id", chainId).maybeSingle<Chain>(),
    supabase
      .from("prompt_chain_steps")
      .select("*")
      .eq("chain_id", chainId)
      .order("step_order")
      .order("id")
      .returns<Step[]>(),
    supabase.from("prompt_chain_runs").select("id", { count: "exact", head: true }).eq("chain_id", chainId),
  ]);
  if (!chain) notFound();
  const stepList = steps ?? [];

  return (
    <div className={page}>
      <Link href="/" className={`${muted} hover:underline`}>← All chains</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>{chain.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/chains/${chainId}/runs`} className={secondaryButton}>
            Generated suggestions ({runCount ?? 0} runs)
          </Link>
          <form action={duplicateChain.bind(null, chainId)}>
            <button className={secondaryButton}>Duplicate</button>
          </form>
          <DeleteButton action={deleteChain.bind(null, chainId)} label={chain.name} />
        </div>
      </div>
      {chain.description && <p className="mt-1 text-zinc-700 dark:text-zinc-300">{chain.description}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={h2}>Steps</h2>
            <Link href={`/chains/${chainId}/steps/new`} className={primaryButton}>Add step</Link>
          </div>

          {stepList.length === 0 && (
            <div className={`${card} text-center ${muted}`}>
              No steps yet. A chain needs at least one step, and the last one usually outputs suggestions.
            </div>
          )}

          <ol className="flex flex-col gap-3">
            {stepList.map((step, index) => {
              const position = index + 1;
              const problems = variableProblems(step, position);
              return (
                <li key={step.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                        {position}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
                        <p className={muted}>
                          {step.model}
                          {step.temperature !== null && ` · temp ${step.temperature}`}
                          {" · outputs "}
                          {step.output_type === "suggestions" ? "suggestions (JSON)" : "text"}
                        </p>
                      </div>
                    </div>
                    <StepControls
                      position={position}
                      count={stepList.length}
                      move={moveStep.bind(null, chainId, step.id)}
                    />
                  </div>

                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {step.user_prompt}
                  </p>

                  {problems.length > 0 && (
                    <ul className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {problems.map((p) => <li key={p}>⚠ {p}</li>)}
                    </ul>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Link href={`/chains/${chainId}/steps/${step.id}`} className={secondaryButton}>Edit</Link>
                    <DeleteButton
                      action={deleteStep.bind(null, chainId, step.id)}
                      label={`step ${position}: ${step.title}`}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="flex flex-col gap-6">
          <div className={card}>
            <h2 className={`${h2} mb-1`}>Run this chain</h2>
            <p className={`${muted} mb-4`}>Try it with a sample Free NYC search.</p>
            <RunForm chainId={chainId} stepCount={stepList.length} />
          </div>
          <div className={card}>
            <h2 className={`${h2} mb-4`}>Chain details</h2>
            <ChainForm
              action={updateChain.bind(null, chainId)}
              defaults={{ name: chain.name, description: chain.description }}
              submitLabel="Save"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
