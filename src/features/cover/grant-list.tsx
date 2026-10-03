import Link from "next/link";
import { revokeCover } from "./actions";
import type { GrantRow } from "./types";

type Props = { grants: GrantRow[]; me: string; names: Map<string, string>; clientNames: Map<string, string> };

function who(id: string | null, names: Map<string, string>): string {
  return (id && names.get(id)) ?? "a colleague";
}

function scope(g: GrantRow, clientNames: Map<string, string>): string {
  return g.client_id ? (clientNames.get(g.client_id) ?? "one client") : "whole caseload";
}

function status(g: GrantRow): string {
  if (g.revoked_at) return "Revoked";
  if (g.ends_at && new Date(g.ends_at) < new Date()) return "Ended";
  return g.ends_at ? `Until ${new Date(g.ends_at).toLocaleDateString("en-NZ")}` : "Ongoing";
}

export function GrantList({ grants, me, names, clientNames }: Props) {
  const given = grants.filter((g) => g.grantor_practitioner_id === me);
  const received = grants.filter((g) => g.grantor_practitioner_id !== me);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sage-900">Cover</h1>
        <Link href="/cover/new" className="inline-flex items-center min-h-11 px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700">Give cover</Link>
      </div>
      <Section title="Cover I have given" empty="You have not given anyone cover.">
        {given.map((g) => (
          <li key={g.id} className="flex items-center justify-between bg-white border border-warm-200 rounded-[14px] px-4 py-3">
            <div>
              <p className="text-[15px] font-medium text-sage-900">{who(g.grantee_id, names)}: {g.level === "cover" ? "cover" : "view"}, {scope(g, clientNames)}</p>
              <p className="text-xs text-warm-400">{status(g)}{g.kind === "historical" ? " (previous LMC, cannot be revoked)" : ""}{g.reason ? ` · ${g.reason}` : ""}</p>
            </div>
            {!g.revoked_at && g.kind === "standard" && (
              <form action={revokeCover}>
                <input type="hidden" name="id" value={g.id} />
                <button type="submit" className="min-h-11 min-w-11 px-4 py-2 text-sm font-medium text-coral-600 bg-coral-50 border border-coral-100 rounded-full">Revoke</button>
              </form>
            )}
          </li>
        ))}
      </Section>
      <Section title="Cover I have received" empty="Nobody has given you cover.">
        {received.map((g) => (
          <li key={g.id} className="bg-white border border-warm-200 rounded-[14px] px-4 py-3">
            <p className="text-[15px] font-medium text-sage-900">From {who(g.grantor_practitioner_id, names)}: {g.level === "cover" ? "cover" : "view"}, {scope(g, clientNames)}</p>
            <p className="text-xs text-warm-400">{status(g)}</p>
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-medium text-sage-900">{title}</h2>
      {children.length === 0 ? <p className="text-sm text-warm-400">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}
