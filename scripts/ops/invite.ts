// Invites a midwife: records the invite as the operator role, asks the auth service for a
// one-time invite token, and prints the link to send to her. Usage: pnpm ops:invite her@example.nz
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { gatewayKeyHeader } from "../../src/lib/gateway-key-header";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in .env.ops`);
  return v;
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("usage: pnpm ops:invite <email>");
    process.exit(2);
  }
  const supabaseUrl = required("SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = required("SITE_URL");
  const gatewayKey = required("MAURI_GATEWAY_KEY");
  const invitedBy = process.env.USERNAME ?? process.env.USER ?? "operator";

  const db = new Client({ connectionString: required("OPS_DATABASE_URL") });
  await db.connect();
  // The auth service's invite token lasts 24 hours (GOTRUE_MAILER_OTP_EXP, default 86400
  // seconds), so the invite row expires with it rather than with the table's 7 day default.
  const inserted = await db.query<{ id: string }>(
    "insert into public.invite (email, invited_by, expires_at) values ($1, $2, now() + interval '24 hours') returning id",
    [email, invitedBy]
  );
  await db.end();
  const inviteId = inserted.rows[0].id;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { [gatewayKeyHeader]: gatewayKey } },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });
  if (error || !data.properties?.hashed_token) {
    console.error("auth service refused the invite:", error?.message ?? "no token returned");
    console.error(`invite row ${inviteId} was recorded; delete it or retry`);
    process.exit(1);
  }
  const link = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=invite`;
  console.log(`Invite recorded (${inviteId}) for ${email}. Send her this link; it expires in 24 hours:`);
  console.log(link);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
