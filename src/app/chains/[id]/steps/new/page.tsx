import Link from "next/link";
import { notFound } from "next/navigation";
import { createStep } from "@/app/chains/actions";
import { StepForm } from "@/components/step-form";
import { requireSuperadmin } from "@/lib/auth";
import { parseId } from "@/lib/chain";
import { card, h1, muted, page } from "@/lib/ui";

export default async function NewStepPage({ params }: PageProps<"/chains/[id]/steps/new">) {
  const chainId = parseId((await params).id);
  if (!chainId) notFound();

  const { supabase } = await requireSuperadmin();
  const [{ data: chain }, { count }] = await Promise.all([
    supabase.from("prompt_chains").select("name").eq("id", chainId).maybeSingle(),
    supabase.from("prompt_chain_steps").select("id", { count: "exact", head: true }).eq("chain_id", chainId),
  ]);
  if (!chain) notFound();
  const stepCount = count ?? 0;

  return (
    <div className={`${page} max-w-3xl`}>
      <Link href={`/chains/${chainId}`} className={`${muted} hover:underline`}>← {chain.name}</Link>
      <h1 className={`${h1} mt-2 mb-6`}>New step</h1>
      <div className={card}>
        <StepForm
          action={createStep.bind(null, chainId)}
          chainId={chainId}
          position={stepCount + 1}
          stepCount={stepCount}
          submitLabel="Add step"
        />
      </div>
    </div>
  );
}
