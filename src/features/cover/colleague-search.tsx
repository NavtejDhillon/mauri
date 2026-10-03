"use client";

import { useRef, useState, useTransition } from "react";
import type { Colleague, ColleagueSearchResult } from "./types";

type Props = { search: (query: string) => Promise<ColleagueSearchResult>; error?: string };

const noMatch = "No colleague found. Check the spelling, including macrons, or ask the operator whether she has an account.";

// Type-ahead that resolves a colleague's name to her practitioner id for the hidden form field.
// A combobox in the ARIA sense: arrow keys move through the matches, Enter chooses, Escape closes,
// and a polite status line reads out how many matched.
export function ColleagueSearch({ search, error }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Colleague[]>([]);
  const [searched, setSearched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Colleague | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  function onChange(value: string) {
    setQuery(value);
    setChosen(null);
    setActive(-1);
    setProblem(null);
    if (value.trim().length < 2) {
      latest.current++;
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    const ticket = ++latest.current;
    startTransition(async () => {
      const result = await search(value);
      // A slower, older search must not replace the results of a newer one.
      if (ticket !== latest.current) return;
      if ("error" in result) {
        setResults([]);
        setProblem(result.error);
      } else {
        setResults(result.colleagues);
      }
      setSearched(true);
      setOpen(true);
    });
  }

  function choose(c: Colleague) {
    setChosen(c);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      // Choose the highlighted colleague instead of submitting the form.
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const expanded = open && !chosen && results.length > 0;
  const status = pending
    ? "Searching..."
    : problem ?? (chosen ? `${chosen.full_name} chosen.` : searched && open ? (results.length === 0 ? noMatch : `${results.length} ${results.length === 1 ? "colleague" : "colleagues"} found. Use the arrow keys to choose.`) : "");
  const describedBy = ["colleague-status", error ? "colleague-error" : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor="colleague" className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        Colleague
      </label>
      <input
        id="colleague"
        role="combobox"
        aria-expanded={expanded}
        aria-controls="colleague-results"
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `colleague-option-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        value={chosen ? chosen.full_name : query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
        placeholder="Start typing her name"
        className={`w-full min-h-11 px-3 py-2 text-base border rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-1 ${
          error ? "border-coral-600 focus:border-coral-600 focus:ring-coral-600" : "border-field-line focus:border-sage-600 focus:ring-sage-600"
        }`}
      />
      <input type="hidden" name="grantee_id" value={chosen?.id ?? ""} />
      <ul id="colleague-results" role="listbox" aria-label="Matching colleagues" hidden={!expanded} className="mt-1 bg-white border border-field-line rounded-[10px] divide-y divide-warm-100 overflow-hidden">
        {results.map((c, i) => (
          <li
            key={c.id}
            id={`colleague-option-${i}`}
            role="option"
            aria-selected={i === active}
            // Keep focus in the input when a mouse or finger picks an option.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(c)}
            className={`flex items-center min-h-11 px-3 py-2 text-sm cursor-pointer ${i === active ? "bg-sage-50 text-sage-900" : "hover:bg-warm-50"}`}
          >
            {c.full_name}
          </li>
        ))}
      </ul>
      <p id="colleague-status" role="status" aria-live="polite" className={`text-xs mt-1.5 ${problem ? "text-coral-600" : "text-warm-400"}`}>
        {status}
      </p>
      {error && (
        <p id="colleague-error" role="alert" className="text-sm text-coral-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
