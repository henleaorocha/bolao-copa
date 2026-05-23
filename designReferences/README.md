# Bolão da Copa 2026

Plataforma de bolão para a Copa do Mundo FIFA 2026 (Canadá · México · EUA). Login com Google, ligas separadas, palpites de placar e de campeão/vice, ranking e mata-mata.

Este repositório contém **protótipos de design em HTML/React** (sem build), prontos para servir de referência visual e funcional na implementação da aplicação real.

---

## 🎯 Visão do Produto

- **48 seleções · 12 grupos · 104 jogos** (formato novo da FIFA, com fase de 32 avos)
- **Login SSO Google** — corporativo, mas extensível para usuários externos
- **Múltiplas ligas** — uma principal + ligas privadas/abertas criadas por usuários
- **Palpites por jogo** (placar exato vale mais) + **palpite de Campeão/Vice** pré-torneio
- **Pontuação crescente por fase** — eliminatórias valem multiplicador (até 4× na Final)
- **Bloqueio rígido**: palpites fecham 1h antes do apito inicial
- **Personalização**: perfil com foto e cor de avatar
- **Convite por link e QR Code** para entrar em ligas

---

## 🎨 Arquivos de Design (referência principal)

### Para abrir no navegador

| Arquivo | O que mostra |
|---|---|
| **[`Bolão da Copa.html`](./Bolão%20da%20Copa.html)** | **Design canvas principal** — todas as 24+ telas (desktop + mobile) lado a lado, organizadas em 7 seções: Onboarding, App Desktop, App Mobile, Variações de Painel, Variações de Palpites, Modais. Use isto como o "Figma" do projeto. |
| **[`Prototipo.html`](./Prototipo.html)** | **Protótipo interativo fullscreen** — fluxo clicável completo (Login → Ligas → Regras → Aposta Campeão → Dashboard → Palpites → Tabela → Mata-mata → Ranking → Perfil). Use para entender comportamento, transições e estados. |

> Ambos rodam direto no browser (CDN React + Tailwind, sem `npm install` necessário). Basta abrir o `.html`.

---

## 📁 Estrutura dos arquivos `.jsx`

Cada arquivo é um módulo de componentes carregado via `<script type="text/babel" src="...">` no HTML. **Não há build** — é Babel-in-the-browser para facilitar a leitura. Para a implementação real, copie a lógica para um projeto Vite/Next.js com import/export normais.

### Dados e tokens

| Arquivo | Conteúdo |
|---|---|
| **[`data.jsx`](./data.jsx)** | Dados mock: 48 seleções (cores, bandeiras, códigos), 12 grupos (A, C e L oficiais — restantes simulados), gerador de jogos round-robin para fase de grupos, 6 rodadas de mata-mata, esquema de pontuação completo, ranking mock e ligas mock. **Ponto de entrada para conectar à API real.** |
| **[`icons.jsx`](./icons.jsx)** | `<Icon name="..."/>` (≈35 ícones SVG estilo Lucide), `<Flag team="..."/>` (faixas verticais com cores oficiais — placeholder), `<TeamChip/>`. Na implementação real, substituir por `lucide-react` direto. |

### Shell e layout

| Arquivo | Conteúdo |
|---|---|
| **[`shell.jsx`](./shell.jsx)** | `Sidebar` (desktop), `BottomNav` (mobile), `Topbar`, `MobileTopbar`, `AppFrame` (wrapper que escolhe layout por dispositivo), `Card`, `Badge`, `GroupBadge`, `PhaseStripe`. Define `NAV_ITEMS` (Painel · Palpites · Tabela · Mata-mata · Ranking · Ligas · Perfil). |

### Telas (uma por fluxo)

| Arquivo | Componentes exportados |
|---|---|
| **[`screens-onboarding.jsx`](./screens-onboarding.jsx)** | `LoginScreen`, `LeaguesScreen`, `CreateLeagueModal` (com upload de logo + acesso aberto/privado + prêmio), `RulesModal` (3 passos), `ChampionBetScreen` (3 passos), `InviteModal` (link + QR + WhatsApp), `QRPlaceholder` |
| **[`screens-dashboard.jsx`](./screens-dashboard.jsx)** | `DashboardScreen` com 3 variantes: **A · Stats Grid** (recomendado desktop), **B · Hero próximo jogo** (recomendado mobile), **C · Timeline focada**. Componentes auxiliares: `CountdownBanner`, `StatCard`, `ChampionPickCard`, `UpcomingMatchesCard`, `MiniRankingCard`, `ScoringHintCard` |
| **[`screens-matches.jsx`](./screens-matches.jsx)** | `MatchesScreen` (com filtros **Todos / Hoje / Amanhã** + filtro de grupos), 2 variantes: **A · Cards expandidos**, **B · Lista densa**. `TableScreen` (tabela de grupos como menu próprio), `GroupsTable`, `MatchDetailScreen` (detalhe de jogo individual), `MatchPredictionCard` |
| **[`screens-extras.jsx`](./screens-extras.jsx)** | `BracketScreen` (chaveamento por fase, multiplicadores), `RankingScreen` (com pódio top 3 + tabela), `ProfileScreen` (foto, cor do avatar, stats, notificações), `Podium` |

### App e canvas

| Arquivo | Conteúdo |
|---|---|
| **[`app.jsx`](./app.jsx)** | `BolaoApp` — orquestra navegação, estado (view, modal, user, predictions, championBet, currentLeague), handlers. Hub central do protótipo. |
| **[`canvas-root.jsx`](./canvas-root.jsx)** | Montagem do `DesignCanvas` com todos os artboards. Lê paleta e nome da liga via Tweaks. |
| **[`tweaks-panel.jsx`](./tweaks-panel.jsx)** | Painel de tweaks ao vivo (não é parte do produto — só do design tool) |

### Helpers de design (do ambiente do protótipo, ignorar na implementação)

`design-canvas.jsx`, `browser-window.jsx`, `ios-frame.jsx`

---

## 🎨 Design System

### Paleta (padrão)

```js
{
  primary:   '#FFC72C',  // amarelo destaque — CTAs, taça, pontos
  secondary: '#0097A9',  // turquesa — ações secundárias, links, ativos
  dark:      '#244C5A',  // azul petróleo — fundos, headers, texto principal
}
```

Outros tokens recorrentes: `#F6F8FA` (fundo de app), `#7E4FE3` (roxo · perfil), `#16A34A` (verde · sucesso), `#FB923C` (laranja · 3º lugar / médio destaque).

### Tipografia

- **Família**: Montserrat (Google Fonts), pesos 400 / 600 / 700 / 800 / 900
- **Hierarquia**: títulos `font-black` (900), seções `font-bold`, labels minúsculas com `tracking-widest uppercase text-[10px]`

### Bordas e sombras

- Raios consistentes: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-[28px]` (cards), `rounded-[36px]` / `rounded-[40px]` (modais e hero)
- Sombras suaves multinivel: `shadow-sm` em cards, `shadow-xl` em CTAs e modais, `shadow-2xl` em hero/destaques

---

## ⚙️ Esquema de Pontuação

| Item | Pontos base |
|---|---|
| Palpite de Campeão (pré-Copa) | **+50** |
| Palpite de Vice-Campeão (pré-Copa) | **+25** |
| Placar exato (fase de grupos) | **+10** |
| Vencedor/empate sem placar exato | **+5** |

### Multiplicadores por fase eliminatória

| Fase | Multiplicador |
|---|---|
| Fase de Grupos | 1× |
| 32 avos | 1.5× |
| Oitavas | 2× |
| Quartas | 2.5× |
| Semifinal | 3× |
| 3º Lugar | 3.5× |
| **Final** | **4×** |

Detalhes completos em `data.jsx` (constantes `SCORING` e `SCORING_BREAKDOWN`).

---

## 🔌 Próximos passos para implementação

### Backend / Dados

1. **Autenticação**: Google OAuth SSO (sugestão: NextAuth.js, Clerk, ou Supabase Auth)
2. **Banco**: Postgres com tabelas `users`, `leagues`, `league_members`, `matches`, `predictions`, `champion_bets`, `scores`
3. **API de jogos**: integrar com API pública para resultados em tempo real. Sugestões:
   - [Football-data.org](https://www.football-data.org) (free tier)
   - [API-Football](https://www.api-football.com)
   - [TheSportsDB](https://www.thesportsdb.com)
   Substituir `MOCK_MATCHES` em `data.jsx` por chamadas reais.
4. **Job de cálculo de pontos**: rodar após cada jogo finalizar (cron ou webhook)
5. **Trava de palpites**: validação no backend (1h antes do `match.date`) — não pode confiar só no frontend

### Frontend

1. Criar projeto Vite + React + TypeScript + Tailwind (ou Next.js App Router)
2. Instalar `lucide-react` e substituir o `<Icon>` interno
3. Portar cada `screens-*.jsx` para componentes TypeScript com props tipadas
4. Roteamento: React Router ou Next.js (rotas = views do `app.jsx`)
5. Estado: React Query para data fetching + Zustand/Context para estado de UI
6. Persistir tweaks de usuário (cor de avatar, foto) no perfil

### Pendências de design

- **Bandeiras reais**: hoje usa faixas SVG simplificadas (`<Flag/>`). Pode usar [flag-icons](https://github.com/lipis/flag-icons) ou emoji nativo
- **Chaveamento eliminatório**: só desenha após fase de grupos. O design tem skeletons "a definir" — implementar lógica de avanço quando definirem os classificados
- **Notificações push/email**: lembrete 1h antes do prazo de cada jogo

---

## 📊 Status dos grupos

Conforme arquivo de referência da FIFA:

- ✅ **Confirmados**: Grupo A (México · África do Sul · Coreia do Sul · República Tcheca), Grupo C (Brasil · Marrocos · Haiti · Escócia), Grupo L (Inglaterra · Croácia · Gana · Panamá)
- ⏳ **Simulados** (no protótipo): Grupos B, D, E, F, G, H, I, J, K — substituir pelos oficiais quando publicados

---

## 🚀 Como rodar o protótipo localmente

```bash
# Não precisa de nada além de um servidor estático
npx serve .
# ou
python3 -m http.server 8000
```

Abrir `http://localhost:8000/Bolão da Copa.html` (canvas) ou `http://localhost:8000/Prototipo.html` (interativo).

---

## 📝 Convenções

- **Sem build**: tudo carrega via CDN (`unpkg`, `cdn.tailwindcss.com`, `fonts.googleapis.com`)
- **Sem import/export**: cada arquivo atribui ao `window` ao final (`Object.assign(window, { ... })`)
- **Babel in-the-browser**: `<script type="text/babel">` transpila JSX em runtime
- **Sem state global**: cada componente recebe props (palette, leagueName, etc.). Estado real fica no `BolaoApp`.

Estas convenções existem **apenas para o protótipo rodar sem build**. Na implementação real, usar ESM, TypeScript, e estrutura de pastas convencional.
