import { createClient } from "@/lib/supabase/server";
import { requestId } from "@/lib/request-id";
import type { ClientSummary } from "./types";

const summaryColumns = "id, first_name, last_name, preferred_name, nhi, date_of_birth, owner_practitioner_id";

export async function listClients(): Promise<ClientSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client")
    .select(summaryColumns)
    .is("deleted_at", null)
    .order("last_name")
    .order("first_name")
    .returns<ClientSummary[]>();
  if (error) throw new Error("Could not load clients: " + error.message);
  return data ?? [];
}

// Loads one client and records that she was opened. Returns null when not found or not accessible;
// the database decides which, and the app does not distinguish.
export async function openClient(id: string): Promise<ClientSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("client").select(summaryColumns).eq("id", id).is("deleted_at", null).maybeSingle<ClientSummary>();
  if (error) throw new Error("Could not load client: " + error.message);
  if (!data) return null;
  const { error: auditError } = await supabase.rpc("record_client_read", { p_client_id: id, p_request_id: await requestId() });
  if (auditError) throw new Error("Could not record access: " + auditError.message);
  return data;
}

export async function currentPractitionerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_practitioner_id");
  if (error) throw new Error("Could not resolve practitioner: " + error.message);
  return (data as string | null) ?? null;
}
