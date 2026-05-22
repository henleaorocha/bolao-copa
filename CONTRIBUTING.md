# Contributing — Bolão da Copa 2026

## Fluxo de trabalho

1. Crie uma branch a partir de `main`: `git checkout -b feat/minha-feature`
2. Faça as alterações seguindo os padrões do projeto
3. Execute os checks localmente antes de abrir PR:
   ```bash
   npm run type-check
   npm run lint
   npm run test
   npm run build
   ```
4. Abra um Pull Request para `main`
5. O CI validará automaticamente lint, type-check, testes e build

## Padrões de código

- **TypeScript strict**: nenhum `any` implícito
- **Comentários**: somente quando o *porquê* não é óbvio no código
- **Server Components por padrão**: use `'use client'` somente quando necessário (interatividade, hooks)
- **Tailwind CSS**: sem CSS customizado salvo exceções justificadas

## Banco de dados

- Toda alteração de schema deve ser feita via migration Supabase CLI:
  ```bash
  supabase migration new <nome_descritivo>
  ```
- Incluir tanto o DDL de criação quanto o de rollback na migration
- Testar localmente com `npm run db:push` antes de abrir PR

## Testes

- Novos endpoints de API devem ter testes em `tests/integration/api-errors.test.ts`
- Novas tabelas com RLS devem ter testes em `tests/integration/rls.test.ts`
- Cobertura mínima: 80% de linhas em `lib/` e `app/api/`

## PRDs

Novas funcionalidades são documentadas como PRDs em `.compozy/tasks/`. Consulte o PRD relevante antes de implementar uma feature para entender o contexto e os acceptance criteria.
