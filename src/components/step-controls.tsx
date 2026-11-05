"use client";

import { useTransition } from "react";

const iconButton =
  "rounded-lg border border-black/[.12] p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:border-white/[.15] dark:text-zinc-300 dark:hover:bg-zinc-800";

// Up / down buttons plus a "move to position" menu for one step.
export function StepControls({
  position,
  count,
  move,
}: {
  position: number;
  count: number;
  move: (position: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const go = (to: number) => startTransition(() => move(to));

  return (
    <div className={`flex items-center gap-1 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        className={iconButton}
        disabled={pending || position === 1}
        onClick={() => go(position - 1)}
        aria-label={`Move step ${position} up`}
        title="Move up"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
          <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.6L5.3 9.7a.75.75 0 1 1-1.1-1.04l5.25-5.5a.75.75 0 0 1 1.1 0l5.25 5.5a.75.75 0 1 1-1.1 1.04l-3.95-4.1v10.65A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={pending || position === count}
        onClick={() => go(position + 1)}
        aria-label={`Move step ${position} down`}
        title="Move down"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
          <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75V14.4l3.95-4.1a.75.75 0 1 1 1.1 1.04l-5.25 5.5a.75.75 0 0 1-1.1 0l-5.25-5.5a.75.75 0 1 1 1.1-1.04l3.95 4.1V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
        </svg>
      </button>
      <select
        aria-label={`Move step ${position} to position`}
        value={position}
        disabled={pending || count < 2}
        onChange={(e) => go(Number(e.target.value))}
        className="rounded-lg border border-black/[.12] bg-white px-1.5 py-1 text-sm text-zinc-700 disabled:opacity-30 dark:border-white/[.15] dark:bg-zinc-950 dark:text-zinc-300"
      >
        {Array.from({ length: count }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1 === position ? `Step ${i + 1}` : `Move to ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );
}
