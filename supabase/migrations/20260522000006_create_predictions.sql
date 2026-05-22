-- Tabela de palpites (usuário × liga × partida)
CREATE TABLE IF NOT EXISTS public.predictions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  league_id             UUID        NOT NULL REFERENCES public.leagues(id)  ON DELETE CASCADE,
  match_id              UUID        NOT NULL REFERENCES public.matches(id)  ON DELETE CASCADE,
  predicted_home_score  INTEGER,
  predicted_away_score  INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, league_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_user_league ON public.predictions(user_id, league_id);
