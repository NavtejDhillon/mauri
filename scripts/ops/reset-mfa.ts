// Removes a midwife's authenticator (TOTP factor) after she has lost it and ends every session
// on her account, so she enrols a new one at her next sign-in and nothing signed in on the lost
// device carries on. Only run this after confirming who she is by a route other than email
// (see README.md). Usage: pnpm ops:reset-mfa her@example.nz
import { createInterface } from "node:readline/promises";
import { createClient, type User } from "@supabase/supabase-js";
import { Client } from "pg";

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
  // A run that removed the authenticator but could not end the sessions is finished by running
  // again, so the sessions are ended even when there is no authenticator left to remove.
  if (totp.length === 0) console.log("No authenticator to remove. At her next sign-in she will be asked to set one up.");

  const what = totp.length === 0 ? "end every session on her account" : `remove ${totp.length === 1 ? "this authenticator" : "these authenticators"} and end every session on her account`;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = (await rl.question(`Type her email address again to ${what}: `)).trim().toLowerCase();
  rl.close();
  if (typed !== email) {
    console.error("The email did not match. Nothing was changed.");
    process.exitCode = 1;
    return;
  }

  // Removing a factor leaves her sessions signed in at the level they had, so a lost phone's
  // session would keep working. Only the database can end them (ops.end_sessions, as mauri_ops).
  // Connect first, so a database problem stops the run before anything is changed.
  const db = new Client({ connectionString: required("OPS_DATABASE_URL") });
  await db.connect();
  try {
    for (const f of totp) {
      const { error } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
      if (error) throw new Error(`could not remove factor ${f.id}: ${error.message}`);
      console.log(`Removed ${f.id}.`);
    }
    let count: number | undefined;
    try {
      const ended = await db.query<{ ended: number }>("select ops.end_sessions($1, $2) as ended", [user.id, "authenticator reset by operator"]);
      count = ended.rows[0]?.ended;
    } catch (e) {
      throw new Error(`could not end her sessions, so the lost device may still be signed in. Run this command again. (${e instanceof Error ? e.message : e})`);
    }
    if (typeof count !== "number") throw new Error("ops.end_sessions returned no count. Run this command again.");
    console.log(`Ended ${count} session${count === 1 ? "" : "s"}.`);
  } finally {
    await db.end();
  }
  console.log("Done. Ask her to sign in with her password; she will be taken to set up a new authenticator.");
  console.log("Access tokens already issued stay valid at the API for up to an hour. If the lost phone may have held her password, reset that too.");
}

// exitCode rather than process.exit, which can abort on Windows while fetch connections close.
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
