-- Tabela de pontuações (gerada pelo sistema; usuários não escrevem)
CREATE TABLE IF NOT EXISTS public.scores (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  league_id      UUID        NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  match_id       UUID        REFERENCES public.matches(id)          ON DELETE SET NULL,
  points_earned  INTEGER     NOT NULL,
  breakdown      JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_user_league ON public.scores(user_id, league_id);
