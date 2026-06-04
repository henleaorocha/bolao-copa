-- Adds is_manual / manual_updated_at columns to matches table.
-- Marks a match as manually controlled by a global operator so the hourly sync
-- never overwrites its score/status (PRD football-api-ingestion, ADR-004 / ADR-008).
-- No read-path changes: every read already selects from matches.
-- Existing rows default to is_manual = false (automatic control preserved):
-- the NOT NULL DEFAULT false backfills all current rows on first apply.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_manual         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_updated_at timestamptz;
