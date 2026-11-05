import type { RunInputs } from "@/lib/chain";

export type RunStatus = "running" | "succeeded" | "failed";

export function StatusBadge({ status }: { status: RunStatus }) {
  const styles = {
    succeeded: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    running: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{status}</span>;
}

export function describeInputs(inputs: RunInputs) {
  return `${inputs.activityType} · ${inputs.timeOfDay} · ≤${inputs.maxTravelMinutes} min from ${inputs.startingPoint}${
    inputs.neighborhood ? ` · ${inputs.neighborhood}` : ""
  }`;
}
