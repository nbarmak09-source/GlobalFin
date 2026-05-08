/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS maintenance script */
/**
 * Runs `prisma migrate deploy` with alternate Supabase Postgres URL shapes when
 * the primary pooler URI fails with P1000 (wrong username format or host).
 *
 * Reads `.env` in the repo root only; does not print connection strings or passwords.
 */
const { readFileSync } = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function parseEnv(filepath) {
  const out = {};
  for (const line of readFileSync(filepath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function buildUrl({ user, pass, host, port, db, search }) {
  const enc = (s) => encodeURIComponent(s);
  const q = search && search.length ? `?${search}` : "";
  return `postgresql://${enc(user)}:${enc(pass)}@${host}:${port}/${db}${q}`;
}

function urlParts(dbUrl) {
  const u = new URL(dbUrl);
  return {
    user: decodeURIComponent(u.username || ""),
    pass: decodeURIComponent(u.password || ""),
    host: u.hostname,
    port: u.port || "5432",
    db: (u.pathname || "/postgres").replace(/^\//, "") || "postgres",
  };
}

function refFromSupabaseUrl(supa) {
  if (!supa) return null;
  try {
    return new URL(supa).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function regionFromPoolerHost(host) {
  const m = /^aws-(\d+)-([^.]+)\.pooler\.supabase\.com$/i.exec(host);
  if (!m) return null;
  return `aws-${m[1]}-${m[2]}`;
}

const envPath = path.join(root, ".env");
const env = parseEnv(envPath);
const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL in .env");
  process.exit(1);
}

const base = urlParts(dbUrl);
const ref = refFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
const region = regionFromPoolerHost(base.host);

/** @type {string[]} */
const candidates = [];

candidates.push(dbUrl);
candidates.push(
  buildUrl({
    user: "postgres",
    pass: base.pass,
    host: base.host,
    port: base.port,
    db: base.db,
  })
);

if (ref) {
  candidates.push(
    buildUrl({
      user: "postgres",
      pass: base.pass,
      host: `db.${ref}.supabase.co`,
      port: "5432",
      db: base.db,
    })
  );
}

if (ref && region) {
  candidates.push(
    buildUrl({
      user: `postgres.${ref}`,
      pass: base.pass,
      host: `${region}.pooler.supabase.com`,
      port: "5432",
      db: base.db,
    })
  );
  candidates.push(
    buildUrl({
      user: `postgres.${ref}`,
      pass: base.pass,
      host: `${region}.pooler.supabase.com`,
      port: "6543",
      db: base.db,
      search: "pgbouncer=true",
    })
  );
}

const seen = new Set();
for (const url of candidates) {
  if (!url || seen.has(url)) continue;
  seen.add(url);
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
    console.log(
      "\nSuccess. Update DATABASE_URL in .env and .env.local to the working URI from Supabase."
    );
    process.exit(0);
  } catch {
    /* try next candidate */
  }
}

console.error(
  "All migration attempts failed. Reset the database password in Supabase and paste the new Session pooler URI."
);
process.exit(1);
