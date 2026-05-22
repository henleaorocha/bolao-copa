# Bolão da Copa 2026

Plataforma de bolão para a Copa do Mundo 2026. Usuários fazem palpites nas partidas, apostam no campeão, e competem por pontos em ligas.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Vercel** (deploy)

## Início rápido

### Pré-requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Conta no [Supabase](https://supabase.com) com Google OAuth configurado

### Instalação

```bash
git clone https://github.com/your-org/bolao-copa.git
cd bolao-copa
npm install
```

### Configuração do ambiente

```bash
cp .env.example .env.local
# Preencha as variáveis com suas credenciais do Supabase
```

### Banco de dados local

```bash
supabase start
npm run db:push
```

### Rodar a aplicação

```bash
npm run dev
# Acesse http://localhost:3000
```

### Testes

```bash
npm run test           # Executa todos os testes
npm run test:watch     # Modo watch
npm run test:coverage  # Com relatório de cobertura
```

## Estrutura do projeto

```
bolao-copa/
├── app/                   # Next.js App Router (páginas e API routes)
│   ├── api/               # API routes (auth/me, auth/logout, health)
│   ├── auth/callback/     # OAuth callback handler
│   ├── dashboard/         # Dashboard autenticado
│   └── login/             # Página de login
├── components/            # Componentes React reutilizáveis
├── lib/
│   ├── api/               # Helpers de resposta da API (formatSuccess, formatError)
│   └── supabase/          # Cliente Supabase (server)
├── supabase/migrations/   # Migrations SQL (Supabase CLI)
├── tests/
│   ├── fixtures/          # Factories de dados de teste
│   ├── integration/       # Testes de integração
│   └── unit/              # Testes unitários
├── docs/                  # Documentação adicional
├── proxy.ts               # Auth middleware (Next.js 16)
└── .github/workflows/     # CI/CD GitHub Actions
```

## Schema do banco de dados

```
users ──────────────────────────── league_members ─── leagues
  │                                      │
  ├── predictions ── matches             │
  ├── champion_bets                      │
  └── scores ── matches
```

Veja [docs/SCHEMA.md](docs/SCHEMA.md) para o diagrama completo e detalhes de cada tabela.

## Deploy

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para instruções completas de deploy.

## API

Veja [docs/API.md](docs/API.md) para a referência completa dos endpoints.

## Segurança

Veja [docs/SECURITY.md](docs/SECURITY.md) para boas práticas e políticas de segurança.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para diretrizes de contribuição.
