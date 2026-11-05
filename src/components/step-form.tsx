"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { FormState } from "@/app/chains/actions";
import { INPUT_VARIABLES, MODELS, type Step } from "@/lib/chain";
import { errorBox, input, label, muted, primaryButton, secondaryButton } from "@/lib/ui";

export function StepForm({
  action,
  chainId,
  defaults,
  position,
  stepCount,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  chainId: number;
  defaults?: Step;
  // This step's position (existing steps), or where a new one goes by default.
  position: number;
  stepCount: number;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const userPrompt = useRef<HTMLTextAreaElement>(null);
  const isNew = !defaults;

  const variables = [
    ...INPUT_VARIABLES.map((v) => ({ name: v.name, help: v.help })),
    ...(position > 1 ? [{ name: "previousOutput", help: `Output of step ${position - 1}` }] : []),
    ...Array.from({ length: position - 1 }, (_, i) => ({
      name: `step${i + 1}Output`,
      help: `Output of step ${i + 1}`,
    })),
  ];

  // Inserts ${name} at the cursor in the user prompt.
  function insertVariable(name: string) {
    const el = userPrompt.current;
    if (!el) return;
    const token = `\${${name}}`;
    const { selectionStart: start, selectionEnd: end, value } = el;
    el.value = value.slice(0, start) + token + value.slice(end);
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="title" className={label}>Title</label>
          <input id="title" name="title" required defaultValue={defaults?.title} className={input} placeholder="e.g. Brainstorm free places" />
        </div>
        {isNew && (
          <div>
            <label htmlFor="position" className={label}>Position</label>
            <select id="position" name="position" defaultValue={position} className={input}>
              {Array.from({ length: stepCount + 1 }, (_, i) => (
                <option key={i} value={i + 1}>
                  Step {i + 1}{i === stepCount ? " (last)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="model" className={label}>Model</label>
          <input
            id="model"
            name="model"
            list="models"
            required
            defaultValue={defaults?.model ?? MODELS[0]}
            className={input}
          />
          <datalist id="models">
            {MODELS.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="temperature" className={label}>Temperature</label>
          <input
            id="temperature"
            name="temperature"
            type="number"
            step="0.1"
            min={0}
            max={2}
            defaultValue={defaults?.temperature ?? ""}
            placeholder="Model default"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="output_type" className={label}>Output</label>
          <select id="output_type" name="output_type" defaultValue={defaults?.output_type ?? "text"} className={input}>
            <option value="text">Text</option>
            <option value="suggestions">Free NYC suggestions (JSON)</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="system_prompt" className={label}>System prompt <span className="font-normal text-zinc-400">(optional)</span></label>
        <textarea
          id="system_prompt"
          name="system_prompt"
          rows={3}
          defaultValue={defaults?.system_prompt ?? ""}
          className={`${input} font-mono`}
          placeholder="You are a local NYC expert…"
        />
      </div>

      <div>
        <label htmlFor="user_prompt" className={label}>User prompt</label>
        <textarea
          ref={userPrompt}
          id="user_prompt"
          name="user_prompt"
          rows={10}
          required
          defaultValue={defaults?.user_prompt}
          className={`${input} font-mono`}
          placeholder={position > 1 ? "Here are some ideas:\n\n${previousOutput}\n\nPick the best 4…" : "List 12 free things to do near ${startingPoint}…"}
        />
        <p className={`${muted} mt-2`}>Click a variable to insert it. It is replaced with its value when the chain runs.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v.name}
              type="button"
              title={v.help}
              onClick={() => insertVariable(v.name)}
              className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {`\${${v.name}}`}
            </button>
          ))}
        </div>
        {isNew && (
          <p className={`${muted} mt-2`}>
            Step-output variables shown are for position {position}; if you pick another position, check them on the chain page.
          </p>
        )}
      </div>

      {state.error && <p className={errorBox}>{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className={primaryButton}>{pending ? "Saving…" : submitLabel}</button>
        <Link href={`/chains/${chainId}`} className={secondaryButton}>Cancel</Link>
      </div>
    </form>
  );
}
