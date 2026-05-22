-- Tabela de membros de ligas (relação usuário ↔ liga)
CREATE TABLE IF NOT EXISTS public.league_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  UUID        NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_league_members_user_id   ON public.league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_league_id ON public.league_members(league_id);
