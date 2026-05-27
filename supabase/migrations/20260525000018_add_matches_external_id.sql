-- Adds external_id, venue, city, home_flag, away_flag columns to matches table.
-- Required for syncing Copa 2026 fixture data from API Football (PRD match-bets).
-- Existing placeholder rows will have external_id = NULL; sync endpoint deletes them on first run.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS external_id  TEXT,
  ADD COLUMN IF NOT EXISTS venue        TEXT,
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS home_flag    TEXT,
  ADD COLUMN IF NOT EXISTS away_flag    TEXT;

-- Add UNIQUE constraint on external_id idempotently
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.matches'::regclass
      AND conname = 'matches_external_id_key'
  ) THEN
    ALTER TABLE public.matches ADD CONSTRAINT matches_external_id_key UNIQUE (external_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_external_id   ON public.matches (external_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase_status  ON public.matches (phase, status);
