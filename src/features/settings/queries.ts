import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  midwifery_council_number: string | null;
  hpi_cpn: string | null;
};

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("practitioner").select("id, full_name, email, phone, midwifery_council_number, hpi_cpn").single<Profile>();
  if (error || !data) throw new Error("Could not load your profile: " + (error?.message ?? "no row"));
  return data;
}
