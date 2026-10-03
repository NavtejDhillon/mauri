// Removes a midwife's authenticator (TOTP factor) after she has lost it and ends every session
// on her account (forgetting her known devices too), so she enrols a new one at her next sign-in
// and nothing signed in on the lost device carries on. With --temporary-password it first gives
// her a new random password, for when the lost phone may have held the old one. Only run this after confirming who she is by a route other than email
// (see README.md). Usage: pnpm ops:reset-mfa [--temporary-password] her@example.nz
import { randomInt } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { createClient, type User } from "@supabase/supabase-js";
import { Client } from "pg";
import { gatewayKeyHeader } from "../../src/lib/gateway-key-header";

const usage = `usage: pnpm ops:reset-mfa [--temporary-password] <email>

Removes her authenticator, ends every session on her account and forgets her known devices,
after you type her email address again to confirm.

  --temporary-password  Also give her a new random password, set before the authenticator is
                        removed and shown once. Use it whenever the lost phone may have held her
                        password. Read it to her over the verified call; never send it by text
                        or email.
  --help                Show this and change nothing.`;

// URL-safe characters only, so the password reads aloud and types without surprises.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function temporaryPassword(length = 24): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in .env.ops`);
  return v;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: { "temporary-password": { type: "boolean" }, help: { type: "boolean", short: "h" } },
    });
  } catch (e) {
    console.error(`${e instanceof Error ? e.message : e}\n\n${usage}`);
    process.exitCode = 2;
    return;
  }
  if (parsed.values.help) {
    console.log(usage);
    return;
  }
  const newPassword = parsed.values["temporary-password"] === true;
  const email = (parsed.positionals[0] ?? "").trim().toLowerCase();
  if (parsed.positionals.length !== 1 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { [gatewayKeyHeader]: required("MAURI_GATEWAY_KEY") } },
  });

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

  const steps = [
    ...(newPassword ? ["give her a temporary password"] : []),
    ...(totp.length === 0 ? [] : [`remove ${totp.length === 1 ? "this authenticator" : "these authenticators"}`]),
    "end every session on her account",
  ];
  const what = steps.length === 1 ? steps[0] : `${steps.slice(0, -1).join(", ")} and ${steps[steps.length - 1]}`;
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
    // The password goes first: if anything after it fails, she still has a password nobody else
    // knows, and it is shown straight away so it is never lost.
    if (newPassword) {
      const password = temporaryPassword();
      const { error } = await admin.auth.admin.updateUserById(user.id, { password });
      if (error) throw new Error(`could not set a temporary password, so nothing was changed: ${error.message}`);
      console.log("");
      console.log(`Temporary password: ${password}`);
      console.log("Read it to her now over the verified call. Never send it by text or email, and do not write it down anywhere else.");
      console.log("If this run stops below, run it again without --temporary-password so this password stays hers.");
      console.log("");
    }
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
  console.log(`Done. Ask her to sign in with ${newPassword ? "the temporary password" : "her password"}; she will be taken to set up a new authenticator.`);
  console.log("Access tokens already issued stay valid at the API for up to an hour.");
  if (!newPassword) console.log("If the lost phone may have held her password, run this again with --temporary-password.");
}

// exitCode rather than process.exit, which can abort on Windows while fetch connections close.
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
