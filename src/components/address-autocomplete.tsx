"use client";

// Copied from the main Free NYC app (nextjs-hello-world/src/components/address-autocomplete.tsx),
// with an id prop so the form label can point at the input.

import { useEffect, useRef, useState } from "react";

type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
};

export type SelectedAddress = {
  displayName: string;
  lat: number;
  lon: number;
};

export function AddressAutocomplete({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: SelectedAddress | null;
  onChange: (value: SelectedAddress | null) => void;
}) {
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Tags each outgoing request so a late-arriving response from an older
  // keystroke can't overwrite results from a more recent one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onChange(null); // typing invalidates any previously selected address

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      requestIdRef.current++; // invalidate any in-flight request
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(text)}`
        );
        const data = await res.json();

        // A newer request has already started (or finished) — this
        // response is stale, so drop it instead of showing outdated
        // results for whatever is currently typed.
        if (requestId !== requestIdRef.current) return;

        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (result: GeocodeResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current++; // invalidate any in-flight request
    setQuery(result.displayName);
    onChange(result);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Start typing a NYC address or place..."
        className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
      />

      {value && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          ✓ Valid address selected
        </p>
      )}
      {!value && query.trim().length > 0 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Select a suggestion from the list to confirm a real address.
        </p>
      )}

      {open && (loading || results.length > 0) && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-900">
          {loading && (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              Searching...
            </li>
          )}
          {!loading &&
            results.map((result, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No matches found.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
