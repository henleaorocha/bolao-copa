-- Verification result: `prizes` column was absent from `leagues` table before this migration.
-- The table has a `prize_pool TEXT` column (different field); this adds a separate `prizes TEXT` column.
-- All existing rows will have prizes = NULL after migration (no data loss, no default value injected).
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS prizes TEXT;
