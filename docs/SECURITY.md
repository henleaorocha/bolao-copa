# Security Guide — Bolão da Copa 2026

## Gerenciamento de sessão

- **HTTP-only cookies**: O token JWT é armazenado em cookie HTTP-only (inacessível ao JavaScript)
- **PKCE**: Fluxo OAuth com PKCE (Proof Key for Code Exchange) — mitiga ataques de intercepção
- **JWT refresh automático**: O `proxy.ts` (middleware) renova o token a cada requisição usando `@supabase/ssr`
- **SameSite=Lax**: Cookie configurado com SameSite=Lax para proteção básica contra CSRF

## Row-Level Security (RLS)

Todas as tabelas de dados do usuário têm RLS ativo:

- `predictions`: usuário pode apenas ler/escrever suas próprias linhas
- `champion_bets`: usuário pode apenas ler/escrever suas próprias linhas
- `scores`: usuário pode apenas ler suas próprias linhas

Verificar com o Supabase RLS Test Tool após qualquer alteração de política.

## Proteção da API

- **Origin validation** em `POST /api/auth/logout`: valida o header `Origin` para mitigar CSRF
- **Inputs validados** em todos os endpoints: query params, Content-Type
- **Mensagens de erro sanitizadas**: nenhum stack trace exposto em produção
- **Proxy (middleware)**: APIs protegidas retornam JSON 401 — nunca redirect HTML

## Variáveis de ambiente

- **Nunca** commitar `.env.local` ou arquivos com segredos
- Usar Vercel Secrets Manager para produção
- `SUPABASE_SERVICE_ROLE_KEY` deve ser usada **apenas no servidor** — nunca exposta ao browser
- Rotacionar chaves imediatamente se expostas em um commit ou log

## HTTPS e transporte

- Produção: HTTPS obrigatório (Vercel enforça automaticamente)
- `Secure` flag no cookie em produção (Supabase SSR configura automaticamente)

## Resposta a incidentes

Se credenciais forem expostas:
1. Revogar a chave imediatamente no painel Supabase / Vercel
2. Gerar novas credenciais
3. Atualizar secrets no GitHub e no Vercel
4. Verificar logs de acesso no Supabase por atividade suspeita
5. Comunicar ao responsável técnico dentro de 24h
