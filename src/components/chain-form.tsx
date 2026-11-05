"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/chains/actions";
import { errorBox, input, label, primaryButton } from "@/lib/ui";

export function ChainForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: { name: string; description: string | null };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className={label}>Name</label>
        <input id="name" name="name" required defaultValue={defaults?.name} className={input} placeholder="e.g. Hidden gems" />
      </div>
      <div>
        <label htmlFor="description" className={label}>Description</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
          className={input}
          placeholder="What this chain is for"
        />
      </div>
      {state.error && <p className={errorBox}>{state.error}</p>}
      <div>
        <button disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
