"use client";

import { useState, useTransition } from "react";
import type { Colleague } from "./types";

type Props = { search: (query: string) => Promise<Colleague[]> };

// Type-ahead that resolves a colleague's name to her practitioner id for the hidden form field.
export function ColleagueSearch({ search }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Colleague[]>([]);
  const [chosen, setChosen] = useState<Colleague | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    setQuery(value);
    setChosen(null);
    if (value.trim().length < 2) return setResults([]);
    startTransition(async () => setResults(await search(value)));
  }

  return (
    <div>
      <label htmlFor="colleague" className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        Colleague
      </label>
      <input
        id="colleague"
        value={chosen ? chosen.full_name : query}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        placeholder="Start typing her name"
        className="w-full px-3 py-2 text-base md:text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
      />
      <input type="hidden" name="grantee_id" value={chosen?.id ?? ""} />
      {!chosen && results.length > 0 && (
        <ul className="mt-1 bg-white border border-warm-200 rounded-[10px] divide-y divide-warm-100">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setChosen(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-warm-50">
                {c.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && <p className="text-xs text-warm-400 mt-1">Searching...</p>}
    </div>
  );
}
