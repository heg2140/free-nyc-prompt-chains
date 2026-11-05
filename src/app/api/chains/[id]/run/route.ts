import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth";
import {
  isSuggestion,
  parseId,
  renderPrompt,
  variableProblems,
  type RunInputs,
  type Step,
  type Suggestion,
} from "@/lib/chain";
import { ACTIVITY_TYPES, SEARCHABLE_NEIGHBORHOODS, TIMES_OF_DAY } from "@/lib/explore-constants";
import { generate } from "@/lib/gemini";

// A chain makes one model call per step, so give it room to finish.
export const maxDuration = 300;

function readInputs(body: unknown): RunInputs | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const startingPoint = typeof b.startingPoint === "string" ? b.startingPoint.trim() : "";
  const activityType = typeof b.activityType === "string" ? b.activityType : "";
  const timeOfDay = typeof b.timeOfDay === "string" ? b.timeOfDay : "";
  const maxTravelMinutes = Number(b.maxTravelMinutes);
  const neighborhood = typeof b.neighborhood === "string" && b.neighborhood ? b.neighborhood : null;

  if (!startingPoint) return "Enter a starting point.";
  if (!(ACTIVITY_TYPES as readonly string[]).includes(activityType)) return "Pick an activity type.";
  if (!(TIMES_OF_DAY as readonly string[]).includes(timeOfDay)) return "Pick a time of day.";
  if (!Number.isFinite(maxTravelMinutes) || maxTravelMinutes <= 0 || maxTravelMinutes > 180)
    return "Travel time must be between 1 and 180 minutes.";
  if (neighborhood && !(SEARCHABLE_NEIGHBORHOODS as readonly string[]).includes(neighborhood))
    return "Pick a neighborhood from the list.";
  return { startingPoint, activityType, timeOfDay, maxTravelMinutes, neighborhood };
}

function parseSuggestions(output: string): Suggestion[] {
  // Gemini's JSON mode returns bare JSON, but strip a code fence just in case.
  const cleaned = output.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || !parsed.every(isSuggestion)) {
    throw new Error("The model's answer wasn't a list of suggestions.");
  }
  return parsed;
}

export async function POST(request: Request, ctx: RouteContext<"/api/chains/[id]/run">) {
  const { supabase, user } = await requireSuperadmin();
  const chainId = parseId((await ctx.params).id);
  if (!chainId) return NextResponse.json({ error: "Unknown chain." }, { status: 404 });

  const inputs = readInputs(await request.json().catch(() => null));
  if (typeof inputs === "string") return NextResponse.json({ error: inputs }, { status: 400 });

  const { data: steps, error: stepsError } = await supabase
    .from("prompt_chain_steps")
    .select("*")
    .eq("chain_id", chainId)
    .order("step_order")
    .order("id")
    .returns<Step[]>();
  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });
  if (!steps?.length) return NextResponse.json({ error: "Add a step before running this chain." }, { status: 400 });

  const problems = steps.flatMap((s, i) => variableProblems(s, i + 1).map((p) => `Step ${i + 1}: ${p}`));
  if (problems.length) return NextResponse.json({ error: problems.join(" · ") }, { status: 400 });

  const { data: run, error: runError } = await supabase
    .from("prompt_chain_runs")
    .insert({ chain_id: chainId, user_id: user.id, inputs })
    .select("id")
    .single();
  if (runError || !run) {
    return NextResponse.json({ error: runError?.message ?? "Couldn't start the run." }, { status: 500 });
  }

  const outputs: string[] = [];
  let suggestions: Suggestion[] | null = null;

  try {
    for (const [index, step] of steps.entries()) {
      const systemPrompt = step.system_prompt ? renderPrompt(step.system_prompt, inputs, outputs) : null;
      const userPrompt = renderPrompt(step.user_prompt, inputs, outputs);
      const started = Date.now();

      let output: string | null = null;
      let usedModel = step.model;
      let stepError: unknown = null;
      try {
        ({ text: output, model: usedModel } = await generate({
          model: step.model,
          systemPrompt,
          userPrompt,
          temperature: step.temperature === null ? null : Number(step.temperature),
          wantSuggestions: step.output_type === "suggestions",
        }));
        if (step.output_type === "suggestions") suggestions = parseSuggestions(output);
      } catch (err) {
        stepError = err;
      }

      await supabase.from("prompt_chain_run_steps").insert({
        run_id: run.id,
        step_id: step.id,
        step_order: index + 1,
        title: step.title,
        // If the step's model was busy, this records the fallback that answered.
        model: usedModel,
        temperature: step.temperature,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        output,
        duration_ms: Date.now() - started,
      });

      if (stepError) {
        const message = stepError instanceof Error ? stepError.message : String(stepError);
        throw new Error(`Step ${index + 1} (${step.title}) failed: ${message}`);
      }
      outputs.push(output!);
    }

    await supabase
      .from("prompt_chain_runs")
      .update({
        status: "succeeded",
        final_output: outputs.at(-1),
        suggestions,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return NextResponse.json({ runId: run.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("prompt_chain_runs")
      .update({ status: "failed", error: message, suggestions, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    return NextResponse.json({ runId: run.id, error: message }, { status: 502 });
  }
}
