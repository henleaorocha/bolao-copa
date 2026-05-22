-- Migration 11: add invite_token and member_count to leagues + sync trigger

ALTER TABLE public.leagues
  ADD COLUMN invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN member_count INTEGER NOT NULL DEFAULT 0;

-- Seed member_count for existing rows (including default league)
UPDATE public.leagues l
  SET member_count = (
    SELECT COUNT(*) FROM public.league_members lm
    WHERE lm.league_id = l.id
  );

-- Trigger function: keep member_count in sync with league_members
CREATE OR REPLACE FUNCTION sync_league_member_count()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.leagues
    SET member_count = (
      SELECT COUNT(*) FROM public.league_members
      WHERE league_id = COALESCE(NEW.league_id, OLD.league_id)
    )
  WHERE id = COALESCE(NEW.league_id, OLD.league_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_count ON public.league_members;
CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR DELETE ON public.league_members
  FOR EACH ROW EXECUTE FUNCTION sync_league_member_count();

-- invite_token is never included in client-facing SELECT statements (API layer).
-- All lookups by token use the service role on the server side (ADR-003).
