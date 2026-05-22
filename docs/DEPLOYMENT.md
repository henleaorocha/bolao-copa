# Deployment Guide — Bolão da Copa 2026

## Ambiente local

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar Supabase local (requer Docker)
supabase start

# 3. Aplicar migrations
npm run db:push

# 4. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha com as credenciais do supabase start (impressas no terminal)

# 5. Rodar o servidor de desenvolvimento
npm run dev
# → http://localhost:3000
```

## Variáveis de ambiente necessárias

| Variável | Ambiente | Descrição |
|----------|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | todos | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | todos | Chave pública anon |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor/CI | Chave service role (secreta) |
| `NEXT_PUBLIC_SITE_URL` | produção | URL pública do app (ex: https://bolao-copa.vercel.app) |

## Deploy no Vercel

### Configuração inicial

1. Conectar o repositório ao Vercel
2. Adicionar as variáveis de ambiente no painel Vercel (Settings → Environment Variables)
3. O deploy acontece automaticamente em cada push para `main`

### Migrations em produção

**Opção A (recomendada): GitHub Actions executa as migrations após o deploy**

O workflow `.github/workflows/ci.yml` executa `supabase db push --linked` após o deploy ser confirmado.

**Opção B: Build command com Supabase CLI**

Adicionar ao `vercel.json`:
```json
{
  "buildCommand": "supabase db push && next build"
}
```

Para verificar se as migrations foram aplicadas:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

### Secrets necessários no GitHub

| Secret | Descrição |
|--------|-----------|
| `VERCEL_TOKEN` | Token de deploy do Vercel |
| `VERCEL_ORG_ID` | ID da organização Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel |
| `SUPABASE_PROJECT_ID` | ID do projeto Supabase (para db push) |
| `SUPABASE_ACCESS_TOKEN` | Token do Supabase CLI |

## Rollback

**Via Vercel:**
1. Acessar o painel Vercel → Deployments
2. Selecionar o deploy anterior → Promote to Production

**Via git:**
```bash
git revert HEAD
git push origin main
```

**Rollback de migration:**
```bash
supabase migration repair --status reverted <migration_version>
```

## Monitoramento

- **Vercel logs**: Painel Vercel → Functions → View logs
- **Supabase logs**: Dashboard Supabase → Logs
- **Endpoint de saúde**: `GET /api/health` verifica conectividade com o banco
