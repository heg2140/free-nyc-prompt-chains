"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { parseId, type OutputType } from "@/lib/chain";

export type FormState = { error: string | null };

type Supabase = Awaited<ReturnType<typeof requireSuperadmin>>["supabase"];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// ---------- Chains ----------

function readChain(formData: FormData) {
  return { name: text(formData, "name"), description: text(formData, "description") || null };
}

export async function createChain(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const values = readChain(formData);
  if (!values.name) return { error: "Give the chain a name." };

  const { data, error } = await supabase.from("prompt_chains").insert(values).select("id").single();
  if (error || !data) return { error: error?.message ?? "Couldn't create the chain." };

  revalidatePath("/");
  redirect(`/chains/${data.id}`);
}

export async function updateChain(
  chainId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const values = readChain(formData);
  if (!values.name) return { error: "Give the chain a name." };

  const { error } = await supabase.from("prompt_chains").update(values).eq("id", chainId);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/chains/${chainId}`);
  return { error: null };
}

export async function deleteChain(chainId: number) {
  const { supabase } = await requireSuperadmin();
  // Steps and runs are removed by the foreign keys' ON DELETE CASCADE.
  const { error } = await supabase.from("prompt_chains").delete().eq("id", chainId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function duplicateChain(chainId: number) {
  const { supabase } = await requireSuperadmin();
  const [{ data: chain }, { data: steps }] = await Promise.all([
    supabase.from("prompt_chains").select("name, description").eq("id", chainId).single(),
    supabase
      .from("prompt_chain_steps")
      .select("step_order, title, model, temperature, system_prompt, user_prompt, output_type")
      .eq("chain_id", chainId)
      .order("step_order"),
  ]);
  if (!chain) throw new Error("That chain no longer exists.");

  const { data: copy, error } = await supabase
    .from("prompt_chains")
    .insert({ name: `${chain.name} (copy)`, description: chain.description })
    .select("id")
    .single();
  if (error || !copy) throw new Error(error?.message ?? "Couldn't copy the chain.");

  if (steps?.length) {
    const { error: stepsError } = await supabase
      .from("prompt_chain_steps")
      .insert(steps.map((s) => ({ ...s, chain_id: copy.id })));
    if (stepsError) throw new Error(stepsError.message);
  }

  revalidatePath("/");
  redirect(`/chains/${copy.id}`);
}

// ---------- Steps ----------

function readStep(formData: FormData) {
  const tempRaw = text(formData, "temperature");
  const temperature = tempRaw === "" ? null : Number(tempRaw);
  const outputType = text(formData, "output_type") as OutputType;
  const values = {
    title: text(formData, "title"),
    model: text(formData, "model"),
    temperature,
    system_prompt: text(formData, "system_prompt") || null,
    user_prompt: text(formData, "user_prompt"),
    output_type: outputType,
  };

  let error: string | null = null;
  if (!values.title) error = "Give the step a title.";
  else if (!values.model) error = "Pick a model.";
  else if (!values.user_prompt) error = "Write a user prompt.";
  else if (temperature !== null && !(temperature >= 0 && temperature <= 2))
    error = "Temperature must be between 0 and 2, or blank for the model default.";
  else if (outputType !== "text" && outputType !== "suggestions") error = "Pick an output type.";
  return { values, error };
}

async function stepIds(supabase: Supabase, chainId: number) {
  const { data, error } = await supabase
    .from("prompt_chain_steps")
    .select("id, step_order")
    .eq("chain_id", chainId)
    .order("step_order")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ id: s.id as number, step_order: s.step_order as number }));
}

// Writes step_order = 1, 2, 3, ... for the given order, touching only rows
// whose number changed.
async function renumber(supabase: Supabase, ordered: { id: number; step_order: number }[]) {
  for (const [index, step] of ordered.entries()) {
    if (step.step_order === index + 1) continue;
    const { error } = await supabase
      .from("prompt_chain_steps")
      .update({ step_order: index + 1 })
      .eq("id", step.id);
    if (error) throw new Error(error.message);
  }
}

export async function createStep(
  chainId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const { values, error } = readStep(formData);
  if (error) return { error };

  const existing = await stepIds(supabase, chainId);
  const position = parseId(formData.get("position")) ?? existing.length + 1;

  const { data, error: insertError } = await supabase
    .from("prompt_chain_steps")
    .insert({ ...values, chain_id: chainId, step_order: existing.length + 1 })
    .select("id, step_order")
    .single();
  if (insertError || !data) return { error: insertError?.message ?? "Couldn't add the step." };

  if (position <= existing.length) {
    const ordered = [...existing];
    ordered.splice(position - 1, 0, data);
    await renumber(supabase, ordered);
  }

  revalidatePath(`/chains/${chainId}`);
  redirect(`/chains/${chainId}`);
}

export async function updateStep(
  chainId: number,
  stepId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const { values, error } = readStep(formData);
  if (error) return { error };

  const { error: updateError } = await supabase
    .from("prompt_chain_steps")
    .update(values)
    .eq("id", stepId)
    .eq("chain_id", chainId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/chains/${chainId}`);
  redirect(`/chains/${chainId}`);
}

export async function deleteStep(chainId: number, stepId: number) {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase
    .from("prompt_chain_steps")
    .delete()
    .eq("id", stepId)
    .eq("chain_id", chainId);
  if (error) throw new Error(error.message);

  await renumber(supabase, await stepIds(supabase, chainId));
  revalidatePath(`/chains/${chainId}`);
  redirect(`/chains/${chainId}`);
}

// Moves a step to a 1-based position, shifting the others to make room.
export async function moveStep(chainId: number, stepId: number, position: number) {
  const { supabase } = await requireSuperadmin();
  const ordered = await stepIds(supabase, chainId);
  const from = ordered.findIndex((s) => s.id === stepId);
  if (from === -1) return;

  const to = Math.min(Math.max(position, 1), ordered.length) - 1;
  if (to !== from) {
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
  }
  await renumber(supabase, ordered);
  revalidatePath(`/chains/${chainId}`);
}

// ---------- Runs ----------

export async function deleteRun(chainId: number, runId: number) {
  const { supabase } = await requireSuperadmin();
  const { error } = await supabase
    .from("prompt_chain_runs")
    .delete()
    .eq("id", runId)
    .eq("chain_id", chainId);
  if (error) throw new Error(error.message);
  revalidatePath(`/chains/${chainId}/runs`);
  redirect(`/chains/${chainId}/runs`);
}
