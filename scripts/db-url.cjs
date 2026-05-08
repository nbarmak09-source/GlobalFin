#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- local CLI helper */
/**
 * DATABASE_URL helpers: paste once, sync .env files, optionally pull from Vercel.
 *
 * Usage:
 *   node scripts/db-url.cjs set           # reads .env.database.url
 *   node scripts/db-url.cjs vercel-pull   # vercel env pull production → merge if non-empty
 *   node scripts/db-url.cjs doctor         # prisma migrate status + links
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const DATABASE_FILE = path.join(root, ".env.database.url");
const FILES_TO_UPDATE = [path.join(root, ".env"), path.join(root, ".env.local")];

function usage() {
  console.log(`
Database URL helpers — minimal steps:

  1) Supabase Dashboard → Database → reset password → copy Session pooler URI (port 5432).
  2) Put ONLY that URI into a file named .env.database.url in the project root (one line).
  3) Run: npm run db:url:set
  4) Run: npm run db:doctor
  5) Run: npm run db:migrate:deploy

Other commands:

  npm run db:url:vercel-pull   Pull DATABASE_URL from Vercel Production (CLI); merge if present.
  npm run db:doctor            Check connection (prisma migrate status).

Files .env.database.url are gitignored (via .env*). Never commit secrets.
`);
}

function readEnvPlainKey(filePath, key) {
  if (!fs.existsSync(filePath)) return "";
  const text = fs.readFileSync(filePath, "utf8");
  const m = text.match(new RegExp(`^${key}=(.+)$`, "m"));
  if (!m) return "";
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function mergeEnvDatabaseUrl(targetPath, value) {
  const key = "DATABASE_URL";
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const prev = fs.existsSync(targetPath)
    ? fs.readFileSync(targetPath, "utf8")
    : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(prev)
    ? prev.replace(re, line)
    : `${prev.trimEnd()}${prev.trimEnd() ? "\n" : ""}${line}\n`;
  fs.writeFileSync(targetPath, next, "utf8");
}

function readOneLineDatabaseUrl(fromPath = DATABASE_FILE) {
  if (!fs.existsSync(fromPath)) return null;
  const raw = fs.readFileSync(fromPath, "utf8");
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const v = /^["'](.+)["']$/.exec(line)?.[1] ?? line;
    if (/^postgresql:\/\//i.test(v)) return v;
    console.warn("Skipping non-postgres line:", line.slice(0, 20) + "…");
  }
  return null;
}

function extractSupabaseRefs() {
  const supa =
    readEnvPlainKey(path.join(root, ".env"), "NEXT_PUBLIC_SUPABASE_URL") ||
    readEnvPlainKey(path.join(root, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL");
  let projectRef = "";
  try {
    if (supa) projectRef = new URL(supa).hostname.split(".")[0] || "";
  } catch {
    /* ignore */
  }
  return { projectRef, supa };
}

function printLinksHint() {
  const { projectRef } = extractSupabaseRefs();
  console.log("\n--- Fix DATABASE_URL manually ---");
  if (projectRef) {
    console.log(
      `Supabase Database settings (reset password / copy URI):\n  https://supabase.com/dashboard/project/${projectRef}/settings/database`
    );
  } else {
    console.log(
      "Supabase: open your project → Project Settings → Database → copy URI (Session pooler, port 5432)."
    );
  }
  console.log(
    "Vercel env (paste same DATABASE_URL for Production + Preview):\n  https://vercel.com/dashboard → Your project → Settings → Environment Variables\n"
  );
}

function cmdSet() {
  const url = readOneLineDatabaseUrl(DATABASE_FILE);
  if (!url) {
    console.error(`Missing or empty ${path.basename(DATABASE_FILE)}`);
    console.error("Create it with one line: postgresql://postgres....");
    printLinksHint();
    process.exit(1);
  }
  for (const f of FILES_TO_UPDATE) {
    if (!fs.existsSync(f)) {
      fs.writeFileSync(f, `${""}`, "utf8");
    }
    mergeEnvDatabaseUrl(f, url);
    console.log("Updated DATABASE_URL in", path.basename(f));
  }
  console.log("\nRestart `npm run dev` if it is running.");
}

function cmdVercelPull() {
  const tmp = path.join(root, ".env.vercel.pull.tmp");
  try {
    execFileSync("npx", ["vercel", "env", "pull", tmp, "--environment=production", "--yes"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env },
    });
  } catch {
    console.error("\nvercel env pull failed. Run: vercel login && vercel link");
    printLinksHint();
    process.exit(1);
  }
  const parsed = parseDotenvForKey(tmp, "DATABASE_URL");
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (!parsed || parsed.length < 20) {
    console.error(
      "\nVercel returned no DATABASE_URL (empty). Set it in the Vercel dashboard, then:"
    );
    console.error("  npm run db:url:vercel-pull   # again");
    printLinksHint();
    process.exit(1);
  }
  fs.writeFileSync(DATABASE_FILE, `${parsed}\n`, "utf8");
  console.log(`Wrote URI into ${path.basename(DATABASE_FILE)} (pull only; not printed).`);
  cmdSet();
}

function parseDotenvForKey(filepath, key) {
  const text = fs.readFileSync(filepath, "utf8");
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return "";
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function cmdDoctor() {
  try {
    const out = execFileSync(
      "npx",
      ["prisma", "migrate", "status"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      }
    );
    console.log("\n✓ Prisma can talk to the database:\n");
    console.log(out);
  } catch (e) {
    const msg = `${e.stderr || ""}${e.stdout || ""}${e.message || ""}`;
    console.error("\n✗ Connection / migration status failed:\n");
    console.error(msg);
    printLinksHint();
    if (/P1000|authentication failed/i.test(msg)) {
      console.error(
        "\n→ Password/login mismatch. Reset DB password in Supabase then:\n    npm run db:url:set\n"
      );
    }
    if (/P1001|can't reach/i.test(msg)) {
      console.error(
        "\n→ Network/host issue or wrong host. Confirm Session pooler host/port."
      );
    }
    process.exit(1);
  }
}

const cmd = process.argv[2];
switch (cmd) {
  case "set":
    cmdSet();
    break;
  case "vercel-pull":
    cmdVercelPull();
    break;
  case "doctor":
    cmdDoctor();
    break;
  default:
    usage();
    process.exit(process.argv[2] ? 1 : 0);
}
