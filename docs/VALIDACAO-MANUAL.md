# Validação manual antes do lançamento

Guia para validar o Bolão da Copa de ponta a ponta. Tem duas partes:

1. **Como funciona por trás dos panos** — o que cada peça faz e em qual tabela o dado mora, pra você entender o que está testando.
2. **Cenários de teste macro** — checklist do que precisa estar verde antes de divulgar.

A última seção fala de como simular a API Football com um mock fiel ao formato real.

---

## Parte 1 — Como funciona por trás dos panos

### 1.1 Mapa das tabelas

| Tabela | O que guarda | Quem escreve |
|---|---|---|
| `leagues` | Liga, `access_type` (`open`/`private`), `invite_token`, `member_count` | Criador da liga |
| `league_members` | Vínculo usuário × liga, `role` (`admin`/`member`) | Join / criação |
| `matches` | **Jogos da Copa (globais, não por liga)**: times, `match_date`, `phase`, `status`, `home_score`, `away_score`, `external_id` | Sync da API Football |
| `predictions` | Palpite de placar: 1 por (`user_id`, `league_id`, `match_id`) | PUT do usuário |
| `champion_bets` | Aposta de campeão + vice: 1 por (`user_id`, `league_id`) | PUT do usuário |
| `scores` | **Existe no schema mas NÃO é usada.** Ranking é calculado on-the-fly. | Ninguém |

> ⚠️ **Pegadinha importante:** `matches` é **global**. Não há jogos "por liga" — todas as ligas compartilham a mesma tabela de partidas e resultados. O que é por liga são os *palpites* (`predictions`) e a *aposta de campeão* (`champion_bets`).

### 1.2 Como o cálculo de pontos funciona (o coração do sistema)

**Onde mora a lógica:** `lib/scoring.ts` (regras) e `lib/ranking.ts` (agregação).

**Quando roda:** *não existe um job de "calcular pontos"*. A pontuação é recalculada **toda vez que alguém abre o ranking** (`GET /api/leagues/[id]/ranking`). Não há tabela de cache de pontos — é tudo derivado na hora a partir de `predictions` + `matches` finalizados + `champion_bets`.

**Fluxo completo quando entra um resultado oficial:**

```
API Football  ──(sync horário)──►  matches.status='finished'
                                    matches.home_score / away_score preenchidos
                                              │
            usuário abre o ranking ───────────┘
                                              ▼
           ranking endpoint lê: members + predictions(da liga) +
           matches WHERE status='finished' + champion_bets(da liga)
                                              ▼
                         computeRanking() recalcula tudo
```

**Regra de pontuação por jogo** (`scoreGroup`):

| Situação | Pontos (fase de grupos) |
|---|---|
| Placar **exato** (ex.: palpite 2×1, resultado 2×1) | **10** |
| **Resultado certo** mas placar errado (mesmo vencedor / empate) | **5** |
| Errou o resultado | **0** |

O "resultado certo" é avaliado pelo *sinal* da diferença: `sign(palpite_casa − palpite_fora) === sign(real_casa − real_fora)`. Então palpitar 2×1 quando deu 3×0 = 5 pts (ambos vitória do mandante). Palpitar 1×1 quando deu 2×2 = 5 pts (ambos empate).

**Mata-mata** (`scoreKnockout`): é a mesma regra de grupo **multiplicada pelo peso da fase**:

| Fase | `phase` | Multiplicador | Exato | Resultado certo |
|---|---|---|---|---|
| 32-avos | `32nd` | ×1.5 | 15 | 7.5 |
| Oitavas | `16th` | ×2 | 20 | 10 |
| Quartas | `8th` | ×2.5 | 25 | 12.5 |
| Semifinal | `semi` | ×3 | 30 | 15 |
| 3º lugar | `3rd_place` | ×3.5 | 35 | 17.5 |
| Final | `final` | ×4 | 40 | 20 |

**Aposta de campeão** (`scoreChampion`): só pontua **depois que a final é finalizada**. O sistema deriva campeão/vice do jogo de `phase='final'` finalizado (quem fez mais gols é campeão). Acertar o campeão = **+50**; acertar o vice = **+25** (somam: pode ganhar 75).

> Só conta no ranking o jogo com `status='finished'` **e** com `home_score`/`away_score` não-nulos, **e** o usuário precisa ter palpite com os dois placares preenchidos. Faltando qualquer um, aquele jogo simplesmente não soma pra aquele usuário.

### 1.3 Bloqueio de palpite por horário

**Onde:** `app/api/leagues/[id]/predictions/[matchId]/route.ts` (Guard 6).

- Palpite de jogo: bloqueia quando faltam **menos de 1 hora** para o início. Regra exata: se `match_date < agora + 1h` → `403 DEADLINE_PASSED`.
- O `GET /matches` devolve `is_deadline_passed` por jogo usando essa mesma janela de 1h, pra UI travar o card.
- Aposta de campeão (`champion-bet`): trava num **prazo fixo global** — `BET_DEADLINE = 2026-06-11 21:00 UTC` (início da Copa). Depois disso, `409 BET_DEADLINE_PASSED`. Não é por jogo.

### 1.4 Ranking e critério de desempate

**Onde:** `lib/ranking.ts`, função `computeRanking` (ordenação nas linhas 145–159).

Ordem dos critérios (cada um só desempata o anterior):

1. **Mais pontos** (desc).
2. **Tem alguma cravada?** Quem tem ao menos 1 placar exato fica acima de quem não tem nenhum.
3. **Cravada mais recente** — entre quem empatou, quem cravou o placar exato na data **mais recente** sobe. (`exact` mais novo = melhor.)
4. **Nome** em ordem alfabética (pt-BR) como último desempate determinístico.

O endpoint também devolve `exact_scores` (nº de cravadas) e `correct_outcomes` (nº de jogos que pontuaram > 0).

### 1.5 Entrada dos resultados oficiais (sync)

**Onde:** `app/api/admin/sync-matches/route.ts` + `lib/football-api.ts`.

- Protegido por `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
- Busca o JSON gratuito e sem chave do openfootball (`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`).
- Deriva `status`: `score` presente → `finished`; caso contrário → `scheduled` (openfootball não tem conceito de `live`).
- Faz **upsert por `external_id`** e depois **deleta linhas com `external_id` nulo** (ou seja, o seed inicial é descartado quando o sync real roda).
- Agendado **de hora em hora** via `pg_cron` (migration `...021_schedule_hourly_sync.sql`).

### 1.6 Ingestão do mata-mata (resolvida pela migração para o openfootball)

Documentado na memória do projeto (`project-knockout-ingestion-broken`), o caminho antigo tinha três causas — todas endereçadas pela adoção do openfootball (ADR-006):

1. **Formato de timestamp** no `resolveSlot` — **corrigido** (`lib/bracket-skeleton.ts`).
2. **Nomes EN vs PT** — o openfootball também devolve os nomes em inglês ("Mexico", "South Korea"), mas o adaptador agora normaliza EN → PT via `lib/team-names.ts` antes do upsert, então `VALID_TEAM_NAMES`/flags resolvem e `isConfirmedMatchup` passa.
3. **Acoplamento do esqueleto + dedup** — o esqueleto agora casa por `external_id` sintetizado (`wc2026-<num>`/`-final`/`-3rd`/`-<grupo>-<times>`), eliminando a dependência de (data, estádio) e a duplicação.

**Tradução prática para o teste:** a *engine* de pontuação do mata-mata (multiplicadores, campeão/vice, render do chaveamento) está **correta e testada**, e a ingestão automática via openfootball já alimenta `matches` com nomes em PT e `external_id` preenchido. Para validar cenários específicos sem esperar o sync, ainda dá para **semear os jogos manualmente** (nomes em PT, `external_id` preenchido) — ver cenário 7.

---

## Parte 2 — Cenários de teste macro

Legenda de resultado: ✅ passou / ❌ falhou / ⏭️ bloqueado.

### Cenário 1 — Convite e entrada

| # | Passo | Resultado esperado |
|---|---|---|
| 1.1 | Criar liga **privada**, abrir "convidar", copiar link | Link contém `token` (ex.: `/join?...token=<invite_token>`) |
| 1.2 | Em outro usuário, abrir o link e entrar | Vira membro; `active_league_id` aponta pra liga; `member_count` +1 |
| 1.3 | Tentar entrar em liga privada **sem token / token errado** | `403 INVALID_TOKEN` |
| 1.4 | Tentar entrar de novo já sendo membro | `400 ALREADY_A_MEMBER` |

### Cenário 2 — Visualização de liga pública vs privada

| # | Passo | Resultado esperado |
|---|---|---|
| 2.1 | Criar liga **pública** (`access_type='open'`) | Aparece em "descobrir" (`/api/leagues/discover`) |
| 2.2 | Entrar em liga pública **sem token** | Funciona (token só é exigido em `private`) |
| 2.3 | Conferir que liga **privada não aparece** no discover | Discover só lista `open` |
| 2.4 | Discover não lista ligas onde você já é membro | Filtradas da lista |

### Cenário 3 — Palpite salvo de verdade

| # | Passo | Resultado esperado |
|---|---|---|
| 3.1 | Palpitar 2×1 num jogo aberto e salvar | `200`; recarregar a página mantém 2×1 |
| 3.2 | Conferir no banco | Linha em `predictions` com `predicted_home_score=2`, `away=1` |
| 3.3 | Reenviar palpite (3×0) no mesmo jogo | Sobrescreve (upsert por `user+league+match`), não duplica |
| 3.4 | Mesmo usuário em **duas ligas** palpitando o mesmo jogo diferente | Dois registros independentes (palpite é por liga) |
| 3.5 | Placar inválido (negativo, decimal, > 99, texto) | `400 INVALID_BODY` |

### Cenário 4 — Bloqueio por horário

| # | Passo | Resultado esperado |
|---|---|---|
| 4.1 | Jogo que começa em **> 1h** | Palpite permitido; card editável; `is_deadline_passed=false` |
| 4.2 | Jogo que começa em **< 1h** (ou já começou) | `403 DEADLINE_PASSED`; card travado; `is_deadline_passed=true` |
| 4.3 | Aposta de campeão **antes** de 11/06/2026 21:00 UTC | Salva |
| 4.4 | Aposta de campeão **depois** do deadline | `409 BET_DEADLINE_PASSED` |
| 4.5 | Campeão == vice / time inválido | `400 SAME_TEAM` / `400 INVALID_TEAM` |

> Dica: para 4.1/4.2 sem esperar o relógio, ajuste `match_date` do jogo no banco para "agora + 50min" (deve travar) e "agora + 2h" (deve liberar).

### Cenário 5 — Cálculo de pontos por jogo finalizado

| # | Passo | Resultado esperado |
|---|---|---|
| 5.1 | Palpite 2×1; resultado oficial 2×1 (`finished`) | +10 no ranking |
| 5.2 | Palpite 2×1; resultado 3×0 | +5 (acertou vencedor) |
| 5.3 | Palpite 1×1; resultado 2×2 | +5 (acertou empate) |
| 5.4 | Palpite 2×1; resultado 0×2 | +0 |
| 5.5 | Jogo `finished` mas usuário **sem palpite** | +0 (não soma) |
| 5.6 | Jogo ainda `scheduled`/`live` | Não soma, mesmo com palpite |
| 5.7 | Aposta de campeão certa após final finalizada | +50 (campeão) e/ou +25 (vice) |

### Cenário 6 — Posição no ranking e desempate

| # | Passo | Resultado esperado |
|---|---|---|
| 6.1 | A=30pts, B=20pts | A em 1º |
| 6.2 | Empate em pontos; A tem 1 cravada, B nenhuma | A acima de B |
| 6.3 | Empate em pontos, ambos com cravadas | Quem cravou na data **mais recente** sobe |
| 6.4 | Empate total | Ordem alfabética do nome |
| 6.5 | Conferir `exact_scores` e `correct_outcomes` por membro | Batem com os palpites |

### Cenário 7 — Mata-mata (atenção à limitação 1.6)

| # | Passo | Resultado esperado |
|---|---|---|
| 7.1 | Jogo de mata-mata com **dois times reais (nomes PT)** | Palpite permitido |
| 7.2 | Jogo com placeholder (`W_A`, `R_B2`…) ou nome não-confirmado | `409 MATCH_NOT_CONFIRMED` |
| 7.3 | Palpite exato numa **semifinal** (multiplicador ×3) | +30 |
| 7.4 | Resultado certo (não exato) numa **final** (×4) | +20 |
| 7.5 | Validar campeão/vice derivados do jogo `final` finalizado | Campeão = quem fez mais gols |

> Como a ingestão automática do mata-mata pela API ainda não preenche nomes em PT (1.6), **semeie os jogos de mata-mata manualmente** (nomes em PT, `external_id` preenchido, `status`/`scores` conforme o teste) para validar 7.1–7.5.

---

## Parte 3 — Testar com um mock fiel do openfootball

Hoje os testes já mockam `fetchWorldCupFixtures` (ver `tests/unit/sync-result-ingestion.test.ts`). Para a validação manual ponta-a-ponta há dois caminhos:

### Opção A — Substituir a função de fetch (mais simples, mock em código)
O formato exato esperado é o tipo `OpenfootballMatch` de `lib/football-api.ts`:

```ts
{
  round: 'Round of 16',            // "Matchday N" (grupos) | "Round of 32" | "Final" | ...
  num: 76,                         // presente em R32..SF (73..102); ausente na Final e 3º lugar
  date: '2026-06-11',              // só a data
  time: '17:00 UTC-4',             // hora + offset local
  team1: 'Mexico',                 // ⚠️ openfootball devolve EN (ou placeholder: "2A", "W74", "L101")
  team2: 'South Korea',
  group: 'Group A',                // só em jogos de fase de grupos
  ground: 'Los Angeles (Inglewood)', // é uma CIDADE, não o estádio
  score: { ft: [2, 1] }            // ausente até o jogo ser disputado → status scheduled
}
```

O endpoint chama `fetchWorldCupFixtures()` → mapeia cada jogo via `mapOpenfootballMatch` (deriva `status` a partir de `score`, combina `date`+offset em timestamptz, sintetiza `external_id`, normaliza EN → PT e resolve a bandeira) → upsert por `external_id`.

### Opção B — Servidor mock que responde igual ao openfootball (mais fiel)
Subir um endpoint local que devolva `{ "matches": [ ...jogos... ] }` e apontar a URL de fetch pra ele. Isso exercita a chamada HTTP real, o parse e o cache (`revalidate: 3600, tags:['fixtures']`).

> **Nota sobre nomes:** o adaptador já normaliza os nomes EN do openfootball para PT antes do upsert (`lib/team-names.ts`), então jogos com times reais liberam palpite e resolvem bandeira normalmente. Placeholders de mata-mata (`2A`, `W74`, `L101`) seguem como não-confirmados (`isConfirmedMatchup` falha) até os times reais chegarem — comportamento esperado.

Posso, no próximo passo, **montar esse mock pra você** — me diga qual opção prefere:
- um **fixture JSON** + helper que injeta em `fetchWorldCupFixtures` (rápido, bom pra cenários 5/6/7), ou
- um **mini servidor mock** respondendo no formato `{response:[...]}` (mais realista ponta-a-ponta), ou
- um **script SQL de seed** que popula `matches` (grupos + mata-mata em PT, com placares finalizados) — o caminho mais direto pra destravar os cenários 5, 6 e 7 hoje, contornando a limitação do mata-mata.
