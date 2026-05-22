-- ============================================================
-- Row-Level Security (RLS) — todas as tabelas
-- ============================================================

-- users: cada usuário vê apenas seu próprio registro
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);
-- INSERT é feito pelo trigger SECURITY DEFINER; usuários não inserem diretamente

-- leagues: qualquer autenticado vê ligas abertas; membros veem ligas privadas
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leagues_select_open" ON public.leagues
  FOR SELECT USING (
    access_type = 'open'
    OR EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = id AND lm.user_id = auth.uid()
    )
  );

-- league_members: membro vê outros membros da mesma liga
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "league_members_select" ON public.league_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.league_members me
      WHERE me.league_id = league_members.league_id AND me.user_id = auth.uid()
    )
  );

-- predictions: usuário lê/escreve apenas suas próprias
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_all_own" ON public.predictions
  FOR ALL USING (auth.uid() = user_id);

-- champion_bets: usuário lê/escreve apenas suas próprias
ALTER TABLE public.champion_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "champion_bets_all_own" ON public.champion_bets
  FOR ALL USING (auth.uid() = user_id);

-- scores: usuário lê apenas suas próprias; escrita bloqueada (sistema gera)
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores_select_own" ON public.scores
  FOR SELECT USING (auth.uid() = user_id);

-- matches: qualquer autenticado pode ler; escrita bloqueada para usuários
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_authenticated" ON public.matches
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- Triggers de updated_at para predictions e champion_bets
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_predictions   ON public.predictions;
DROP TRIGGER IF EXISTS set_updated_at_champion_bets ON public.champion_bets;

CREATE TRIGGER set_updated_at_predictions
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_champion_bets
  BEFORE UPDATE ON public.champion_bets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
