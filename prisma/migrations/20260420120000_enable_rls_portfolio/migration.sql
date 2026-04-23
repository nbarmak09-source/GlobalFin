-- Portfolio was added after 20260318150000_enable_rls; enable RLS for Supabase Advisor.
-- No permissive policies: PostgREST (anon/authenticated) cannot read rows; Prisma uses a direct DB role.

ALTER TABLE "Portfolio" ENABLE ROW LEVEL SECURITY;
