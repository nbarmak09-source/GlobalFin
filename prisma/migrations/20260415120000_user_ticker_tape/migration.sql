-- Per-user ticker tape: default / portfolio / custom (up to 10 symbols)
ALTER TABLE "User" ADD COLUMN "ticker_tape_mode" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "User" ADD COLUMN "ticker_tape_symbols" JSONB;
