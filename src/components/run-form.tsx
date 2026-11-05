"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddressAutocomplete, type SelectedAddress } from "@/components/address-autocomplete";
import { ACTIVITY_TYPES, SEARCHABLE_NEIGHBORHOODS, TIMES_OF_DAY } from "@/lib/explore-constants";
import { errorBox, input, label, primaryButton } from "@/lib/ui";

export function RunForm({ chainId, stepCount }: { chainId: number; stepCount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Starts on Columbia so a chain can be run without typing an address.
  const [startingPoint, setStartingPoint] = useState<SelectedAddress | null>({
    displayName: "Columbia University, Morningside Heights, New York",
    lat: 40.8075,
    lon: -73.9626,
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!startingPoint) {
      setError("Pick a starting point from the address suggestions.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/chains/${chainId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startingPoint: startingPoint.displayName,
          startingLat: startingPoint.lat,
          startingLon: startingPoint.lon,
          activityType: form.get("activityType"),
          timeOfDay: form.get("timeOfDay"),
          maxTravelMinutes: Number(form.get("maxTravelMinutes")),
          neighborhood: form.get("neighborhood") || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      // Even a failed run is saved, so show it: earlier steps' output helps debugging.
      if (result.runId) {
        router.push(`/chains/${chainId}/runs/${result.runId}`);
        return;
      }
      setError(result.error ?? `The run failed (${response.status}).`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="startingPoint" className={label}>Starting point</label>
        <AddressAutocomplete id="startingPoint" value={startingPoint} onChange={setStartingPoint} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="activityType" className={label}>Activity type</label>
          <select id="activityType" name="activityType" className={input}>
            {ACTIVITY_TYPES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="timeOfDay" className={label}>Time of day</label>
          <select id="timeOfDay" name="timeOfDay" className={input} defaultValue="Afternoon">
            {TIMES_OF_DAY.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="maxTravelMinutes" className={label}>Max travel (minutes)</label>
          <input
            id="maxTravelMinutes"
            name="maxTravelMinutes"
            type="number"
            min={1}
            max={180}
            defaultValue={45}
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor="neighborhood" className={label}>Neighborhood</label>
          <select id="neighborhood" name="neighborhood" className={input} defaultValue="">
            <option value="">Any neighborhood</option>
            {SEARCHABLE_NEIGHBORHOODS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {error && <p className={errorBox}>{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={pending || stepCount === 0} className={primaryButton}>
          {pending ? "Running…" : "Generate suggestions"}
        </button>
        {pending && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Running {stepCount} {stepCount === 1 ? "step" : "steps"}, this can take a minute.
          </span>
        )}
        {stepCount === 0 && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Add a step first.</span>
        )}
      </div>
    </form>
  );
}
