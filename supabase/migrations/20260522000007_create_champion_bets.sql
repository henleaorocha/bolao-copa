-- Tabela de apostas no campeão (usuário × liga)
CREATE TABLE IF NOT EXISTS public.champion_bets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  league_id      UUID        NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  champion_team  TEXT        NOT NULL,
  runner_up_team TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, league_id)
);
