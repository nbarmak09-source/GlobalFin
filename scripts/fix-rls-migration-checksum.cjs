/**
 * Fixes "migration was modified after it was applied" for 20260318150000_enable_rls
 * by setting _prisma_migrations.checksum to SHA-256 of the current migration.sql.
 *
 * Uses `prisma db execute` so the same datasource URL is loaded as `prisma migrate`
 * (from prisma.config.ts / env), and avoids PrismaClient (this app uses driver adapters).
 *
 * Then run: npx prisma migrate dev
 */
const { createHash } = require("crypto");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const MIGRATION_NAME = "20260318150000_enable_rls";

const migrationPath = path.join(
  root,
  "prisma",
  "migrations",
  MIGRATION_NAME,
  "migration.sql"
);

const checksum = createHash("sha256")
  .update(readFileSync(migrationPath, "utf8"))
  .digest("hex");

const sql = `-- Auto-generated: align _prisma_migrations.checksum with repo migration file
UPDATE "_prisma_migrations"
SET "checksum" = '${checksum}'
WHERE "migration_name" = '${MIGRATION_NAME}';
`;

const tmpFile = path.join(os.tmpdir(), `gcm-fix-rls-${Date.now()}.sql`);
writeFileSync(tmpFile, sql, "utf8");

try {
  execFileSync(
    "npx",
    ["prisma", "db", "execute", "--file", tmpFile],
    { cwd: root, stdio: "inherit", env: process.env }
  );
  console.log(`\nUpdated checksum for ${MIGRATION_NAME} → ${checksum}`);
  console.log("Next: npx prisma migrate dev\n");
} finally {
  try {
    unlinkSync(tmpFile);
  } catch {
    /* ignore */
  }
}
