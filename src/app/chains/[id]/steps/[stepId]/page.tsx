import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteStep, updateStep } from "@/app/chains/actions";
import { DeleteButton } from "@/components/delete-button";
import { StepForm } from "@/components/step-form";
import { requireSuperadmin } from "@/lib/auth";
import { parseId, type Step } from "@/lib/chain";
import { card, h1, muted, page } from "@/lib/ui";

export default async function EditStepPage({ params }: PageProps<"/chains/[id]/steps/[stepId]">) {
  const { id, stepId: rawStepId } = await params;
  const chainId = parseId(id);
  const stepId = parseId(rawStepId);
  if (!chainId || !stepId) notFound();

  const { supabase } = await requireSuperadmin();
  const [{ data: chain }, { data: steps }] = await Promise.all([
    supabase.from("prompt_chains").select("name").eq("id", chainId).maybeSingle(),
    supabase
      .from("prompt_chain_steps")
      .select("*")
      .eq("chain_id", chainId)
      .order("step_order")
      .order("id")
      .returns<Step[]>(),
  ]);
  const index = steps?.findIndex((s) => s.id === stepId) ?? -1;
  if (!chain || !steps || index === -1) notFound();
  const step = steps[index];

  return (
    <div className={`${page} max-w-3xl`}>
      <Link href={`/chains/${chainId}`} className={`${muted} hover:underline`}>← {chain.name}</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className={h1}>Step {index + 1}: {step.title}</h1>
        <DeleteButton action={deleteStep.bind(null, chainId, stepId)} label={`step ${index + 1}: ${step.title}`} />
      </div>
      <div className={card}>
        <StepForm
          action={updateStep.bind(null, chainId, stepId)}
          chainId={chainId}
          defaults={step}
          position={index + 1}
          stepCount={steps.length}
          submitLabel="Save step"
        />
      </div>
    </div>
  );
}
