-- Adiciona matches.winner_team: registra o time que AVANÇOU/venceu um jogo de
-- mata-mata decidido nos pênaltis (placar empatado no marcador).
--
-- Motivo: o openfootball exclui pênaltis (lib/football-api.ts) e o controle
-- manual só permitia lançar o placar, então uma FINAL decidida nos pênaltis
-- (ex.: 1×1) deixava o campeão indefinido — lib/ranking.ts derivava campeão/vice
-- apenas comparando home_score vs away_score, e num empate ninguém recebia o
-- bônus de 50/25. Esta coluna permite ao ranking apurar campeão/vice num empate
-- SEM distorcer o placar real do jogo.
--
-- winner_team é NULL na esmagadora maioria dos jogos (só faz sentido em mata-mata
-- empatado). O CHECK garante que, quando preenchido, é exatamente um dos dois
-- times da própria partida. O sync automático nunca escreve nesta coluna e pula
-- linhas is_manual, então não há conflito com o CHECK ao atualizar times.
ALTER TABLE public.matches
  ADD COLUMN winner_team TEXT
  CHECK (
    winner_team IS NULL
    OR winner_team = home_team
    OR winner_team = away_team
  );

COMMENT ON COLUMN public.matches.winner_team IS
  'Time vencedor nos pênaltis quando o placar empata (apenas mata-mata). NULL nos demais casos. Usado pelo ranking para apurar campeão/vice numa final empatada.';
