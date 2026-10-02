// Checks the live catalog of a database for the four exposure patterns:
// 1. a public base table with RLS off
// 2. a policy that lets anon or public through with USING (true)
// 3. a Studio default policy name
// 4. a view or materialised view that anon can select from
// Exit code 1 on any finding outside the allowlist.
import { Client } from "pg";
import { publicReadAllowlist } from "./public-read-allowlist";

// DATABASE_URL points at any database. Without it, the throwaway test database is assumed,
// reachable at DB_TEST_HOST (default localhost) on DB_TEST_PORT (default 54329).
const url =
  process.env.DATABASE_URL ??
  `postgresql://supabase_admin:postgres@${process.env.DB_TEST_HOST ?? "localhost"}:${process.env.DB_TEST_PORT ?? "54329"}/mauri_test`;

const allow = new Set(publicReadAllowlist.map((a) => a.relation));
const findings: string[] = [];

async function main() {
  const db = new Client({ connectionString: url });
  await db.connect();

  const rlsOff = await db.query<{ relname: string }>(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by 1`
  );
  for (const r of rlsOff.rows) findings.push(`RLS off: public.${r.relname}`);

  const openPolicies = await db.query<{ tablename: string; policyname: string; roles: string[]; qual: string | null; cmd: string }>(
    `select tablename, policyname, roles::text[] as roles, qual, cmd from pg_policies where schemaname = 'public' order by 1, 2`
  );
  for (const p of openPolicies.rows) {
    const roles = p.roles.map((x) => x.replace(/[{}"]/g, ""));
    const anonReachable = roles.some((x) => x === "anon" || x === "public" || x === "");
    if (anonReachable && (p.qual === null || p.qual.trim() === "true") && !allow.has(p.tablename)) {
      findings.push(`anon-permitting policy: public.${p.tablename} "${p.policyname}" (${p.cmd}) roles=${roles.join(",")}`);
    }
    if (/^Enable (read access|all access|insert|update|delete) for/i.test(p.policyname)) {
      findings.push(`Studio default policy: public.${p.tablename} "${p.policyname}"`);
    }
  }

  const anonViews = await db.query<{ relname: string }>(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
       and has_table_privilege('anon', c.oid, 'SELECT') order by 1`
  );
  for (const v of anonViews.rows) if (!allow.has(v.relname)) findings.push(`anon can select view: public.${v.relname}`);

  const anonTables = await db.query<{ relname: string }>(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('anon', c.oid, 'SELECT') order by 1`
  );
  for (const t of anonTables.rows) if (!allow.has(t.relname)) findings.push(`anon has SELECT privilege: public.${t.relname}`);

  await db.end();

  if (findings.length) {
    console.error("SECURITY AUDIT FAILED");
    for (const f of findings) console.error(" - " + f);
    process.exit(1);
  }
  console.log("SECURITY AUDIT PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
