import { createClient } from "@/lib/supabase/server";
import type { Colleague, GrantRow } from "./types";

const columns = "id, grantor_practitioner_id, grantee_type, grantee_id, client_id, level, kind, starts_at, ends_at, revoked_at, reason";

// Every grant the policy lets this midwife see: ones she gave and ones she received.
export async function listGrants(): Promise<GrantRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("access_grant").select(columns).order("created_at", { ascending: false }).returns<GrantRow[]>();
  if (error) throw new Error("Could not load cover: " + error.message);
  return data ?? [];
}

export async function searchColleagues(query: string): Promise<Colleague[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_practitioners", { p_query: query });
  if (error) throw new Error("Could not search colleagues: " + error.message);
  return (data as Colleague[]) ?? [];
}

// Names for the practitioners on the other side of this midwife's grants, plus her own.
export async function nameLookup(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const names = new Map<string, string>();
  const { data: me, error: meError } = await supabase.from("practitioner").select("id, full_name").maybeSingle<Colleague>();
  if (meError) throw new Error("Could not load your name: " + meError.message);
  if (me) names.set(me.id, me.full_name);
  const { data, error } = await supabase.rpc("grant_counterparty_names");
  if (error) throw new Error("Could not load colleague names: " + error.message);
  for (const c of (data as Colleague[] | null) ?? []) names.set(c.id, c.full_name);
  return names;
}
