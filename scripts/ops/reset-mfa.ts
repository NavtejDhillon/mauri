// Removes a midwife's authenticator (TOTP factor) after she has lost it, so she enrols a new
// one at her next sign-in. Only run this after confirming who she is by a route other than
// email (see README.md). Usage: pnpm ops:reset-mfa her@example.nz
import { createInterface } from "node:readline/promises";
import { createClient, type User } from "@supabase/supabase-js";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in .env.ops`);
  return v;
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("usage: pnpm ops:reset-mfa <email>");
    process.exitCode = 2;
    return;
  }
  const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });

  // The admin API has no lookup by email, so page through the accounts.
  let user: User | undefined;
  for (let page = 1; !user; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("could not list accounts: " + error.message);
    user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (data.users.length < 200) break;
  }
  if (!user) {
    console.error(`No account for ${email}.`);
    process.exitCode = 1;
    return;
  }

  const { data: listed, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (listError) throw new Error("could not list her authenticators: " + listError.message);
  const totp = listed.factors.filter((f) => f.factor_type === "totp");
  console.log(`Account ${user.id} (${email}) has ${listed.factors.length} factor(s):`);
  for (const f of listed.factors) console.log(`  ${f.id}  ${f.factor_type}  ${f.status}  created ${f.created_at}`);
  if (totp.length === 0) {
    console.log("No authenticator to remove. At her next sign-in she will be asked to set one up.");
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = (await rl.question(`Type her email address again to remove ${totp.length === 1 ? "this authenticator" : "these authenticators"}: `)).trim().toLowerCase();
  rl.close();
  if (typed !== email) {
    console.error("The email did not match. Nothing was removed.");
    process.exitCode = 1;
    return;
  }

  for (const f of totp) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    if (error) throw new Error(`could not remove factor ${f.id}: ${error.message}`);
    console.log(`Removed ${f.id}.`);
  }
  console.log("Done. Ask her to sign in with her password; she will be taken to set up a new authenticator.");
}

// exitCode rather than process.exit, which can abort on Windows while fetch connections close.
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
