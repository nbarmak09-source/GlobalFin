-- Enable Row Level Security (RLS) for Supabase Security Advisor.
-- RLS is intentionally enabled without any permissive policies so that
-- PostgREST (anon/authenticated) cannot access rows by default.
-- Your Next.js server uses the DB connection directly via Prisma.

ALTER TABLE "prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- NextAuth (Prisma Adapter) tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;

-- App data tables
ALTER TABLE "Position" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatchlistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pitch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
