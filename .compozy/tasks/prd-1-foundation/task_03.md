---
status: completed
title: Create database migrations for all 7 tables (users, leagues, league_members, matches, predictions, champion_bets, scores)
type: backend
complexity: medium
dependencies:
  - task_02
---

# Create database migrations for all 7 tables (users, leagues, league_members, matches, predictions, champion_bets, scores)

## Overview

Create Supabase CLI migration files for the complete 7-table database schema: users, leagues, league_members, matches, predictions, champion_bets, and scores. Include seed data (default "Test Bolão" league, mock matches), an auto-enrollment trigger for new users, and RLS policies for read/write access control. This task is blocking for all API routes and tests; it must be completed before task_05 can query the database.

<critical>
Read the **TechSpec "Data Models"** section for exact table definitions, constraints, and RLS policy requirements. Read **"Integration Points"** for trigger logic. Reference the TechSpec examples directly—do NOT invent schema changes. All SQL must be idempotent and reversible (Supabase migrations support this). RLS policies are SECURITY-CRITICAL: test them thoroughly in task_07. Use Supabase CLI (`supabase migration new`, `supabase db push`) to apply migrations locally.
</critical>

<requirements>

1. MUST create 8 migration files (one per table + one for RLS policies) using Supabase CLI:
   - `20260522000001_create_users.sql` — users table
   - `20260522000002_create_leagues.sql` — leagues table + seed default league
   - `20260522000003_create_league_members.sql` — league_members table + auto-enroll trigger
   - `20260522000004_create_matches.sql` — matches table + seed mock data
   - `20260522000005_create_predictions.sql` — predictions table
   - `20260522000006_create_champion_bets.sql` — champion_bets table
   - `20260522000007_create_scores.sql` — scores table
   - `20260522000008_rls_policies.sql` — all RLS policies

2. MUST seed database with:
   - One default league: id=`00000000-0000-0000-0000-000000000001`, name='Test Bolão', access_type='open'
   - Mock match data: All ~104 FIFA World Cup 2026 matches (groups, knockouts) with basic schema (no scores yet)
   - Teams: Brazil, Argentina, France, Germany, England, Spain, Netherlands, Belgium, Portugal, Uruguay, etc. (standard 32 teams)

3. MUST implement auto-enrollment trigger:
   - **ATENÇÃO**: O Supabase Auth cria usuários em `auth.users`, NÃO em `public.users`. O trigger deve ser criado em `auth.users`.
   - Criar função `handle_new_user()` com `SECURITY DEFINER` (obrigatório para escrever em `public.*` a partir de `auth.*`):
     1. Inserir em `public.users` (id, email, full_name, avatar_url vindos de `NEW.raw_user_meta_data`)
     2. Inserir em `public.league_members` (league_id=1, role='member')
   - Trigger `on_auth_user_created` AFTER INSERT ON `auth.users` FOR EACH ROW

   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, full_name, avatar_url)
     VALUES (
       NEW.id,
       NEW.email,
       NEW.raw_user_meta_data->>'full_name',
       NEW.raw_user_meta_data->>'avatar_url'
     );
     INSERT INTO public.league_members (league_id, user_id, role)
     VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'member');
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

4. MUST define RLS policies for all tables com SQL exato:

   **`users`** — usuário vê apenas seu próprio registro; sistema pode inserir via trigger:
   ```sql
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users_select_own" ON public.users
     FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "users_update_own" ON public.users
     FOR UPDATE USING (auth.uid() = id);
   -- INSERT é feito pelo trigger SECURITY DEFINER; usuários não inserem diretamente
   ```

   **`leagues`** — qualquer autenticado pode ver ligas abertas; membros veem suas ligas privadas:
   ```sql
   ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "leagues_select_open" ON public.leagues
     FOR SELECT USING (
       access_type = 'open'
       OR EXISTS (
         SELECT 1 FROM public.league_members lm
         WHERE lm.league_id = id AND lm.user_id = auth.uid()
       )
     );
   -- Nenhum usuário pode criar/editar ligas em Foundation (apenas PRD 2)
   ```

   **`league_members`** — membro pode ver outros membros da mesma liga:
   ```sql
   ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "league_members_select" ON public.league_members
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM public.league_members me
         WHERE me.league_id = league_members.league_id AND me.user_id = auth.uid()
       )
     );
   -- INSERT via trigger SECURITY DEFINER; usuários não inserem diretamente em Foundation
   ```

   **`predictions`** — usuário vê/edita apenas suas próprias:
   ```sql
   ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "predictions_all_own" ON public.predictions
     FOR ALL USING (auth.uid() = user_id);
   ```

   **`champion_bets`** — usuário vê/edita apenas suas próprias:
   ```sql
   ALTER TABLE public.champion_bets ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "champion_bets_all_own" ON public.champion_bets
     FOR ALL USING (auth.uid() = user_id);
   ```

   **`scores`** — usuário vê apenas suas próprias; escrita bloqueada (sistema gera):
   ```sql
   ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "scores_select_own" ON public.scores
     FOR SELECT USING (auth.uid() = user_id);
   ```

   **`matches`** — qualquer autenticado pode ler; escrita bloqueada para usuários:
   ```sql
   ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "matches_select_authenticated" ON public.matches
     FOR SELECT USING (auth.role() = 'authenticated');
   ```

5. MUST adicionar triggers de `updated_at` para tabelas com essa coluna:
   ```sql
   CREATE OR REPLACE FUNCTION public.update_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER set_updated_at_predictions
     BEFORE UPDATE ON public.predictions
     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

   CREATE TRIGGER set_updated_at_champion_bets
     BEFORE UPDATE ON public.champion_bets
     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
   ```
   Sem esses triggers, `updated_at` fica igual a `created_at` para sempre após qualquer UPDATE.

6. MUST ensure all migrations are idempotent:
   - Use `IF NOT EXISTS` for table creation
   - Handle rollback: include both UP and DOWN logic in migration files
   - Test: `supabase db reset` should be repeatable without errors

7. MUST seed mock matches como dados de **placeholder estrutural**, não como calendário real da Copa 2026:
   - As partidas são usadas para testar a estrutura do schema e serão substituídas em PRD 3 via API Football
   - Usar times de exemplo (ex: "BRA", "ARG", "FRA") com datas aproximadas (junho/julho 2026)
   - Não é necessário que os times reflitam os qualificados reais; o objetivo é validar a estrutura
   - Seed com representação de todas as fases: grupos (48 jogos), 32avos (32), 16avos (16), quartas (8), semis (4), 3º lugar (1), final (1) = ~104 entradas com dados fictícios

8. SHOULD add indexes on frequently queried columns:
   - `league_members(user_id, league_id)` — for quick lookup of user's leagues
   - `predictions(user_id, league_id)` — for user's predictions in a league
   - `scores(user_id, league_id)` — for user's scores in a league

</requirements>

## Subtasks

- [ ] Initialize Supabase CLI in project root: `supabase init` (if not already done)
- [ ] Create migration file: `20260522000001_create_users.sql` (users table from Auth)
- [ ] Create migration file: `20260522000002_create_leagues.sql` (leagues + seed Test Bolão)
- [ ] Create migration file: `20260522000003_create_league_members.sql` (league_members table)
- [ ] Create migration file: `20260522000003b_create_user_trigger.sql` (função `handle_new_user()` em `auth.users` com SECURITY DEFINER; trigger `on_auth_user_created` AFTER INSERT ON `auth.users`)
- [ ] Create migration file: `20260522000004_create_matches.sql` (matches + seed 104 World Cup 2026 matches)
- [ ] Create migration file: `20260522000005_create_predictions.sql` (predictions table)
- [ ] Create migration file: `20260522000006_create_champion_bets.sql` (champion_bets table)
- [ ] Create migration file: `20260522000007_create_scores.sql` (scores table)
- [ ] Create migration file: `20260522000008_rls_policies.sql` (all RLS policies per SQL especificado no requisito 4; incluir triggers de `updated_at` para predictions e champion_bets)
- [ ] Apply migrations locally: `supabase db push`
- [ ] Verify schema: `supabase db pull` → check `schema.sql` for all tables and policies
- [ ] Test idempotency: `supabase db reset` should complete without errors
- [ ] Verify seed data: Query `SELECT COUNT(*) FROM leagues;` should return 1; query `SELECT COUNT(*) FROM matches;` should return ~104

## Implementation Details

**Files to create**:
- `supabase/migrations/20260522000001_create_users.sql` through `20260522000008_rls_policies.sql`

**Files to modify**:
- `.env.local` (task_01) — May need `SUPABASE_DB_PASSWORD` for local Supabase CLI

**Database structure** (from TechSpec):
- See TechSpec **"Data Models"** section for exact column definitions, data types, constraints
- See TechSpec **"Integration Points"** for RLS policy definitions

**Integration points**:
- Trigger `auto_enroll_default_league()` fires when a new user is created via Supabase Auth (automatic; no code change needed)
- RLS policies enforce data isolation; tested in task_07
- Seed data (matches) will be replaced in PRD 3 when API Football integration is added

**Reference TechSpec sections**:
- **"Data Models"**: Exact schema for all 7 tables
- **"Integration Points"**: RLS policy specifications
- **"Development Sequencing"**: Build order (migrations run after Supabase config)

### Relevant Files

- `supabase/migrations/` — All migration files (created here)
- `supabase/config.toml` — Supabase local dev config
- `.env.local` (task_01) — Supabase credentials

### Dependent Files

- `app/api/auth/me.ts`, `app/api/auth/logout.ts`, `app/api/health.ts` (task_05) — Query all 7 tables
- `tests/integration/auth.test.ts` (task_07) — Test RLS policies, query test data
- Frontend pages (task_06) — Display data from tables

### Related ADRs

- [[ADR-001]]: Justifies seeding a default league for Foundation end-to-end testing
- [[ADR-004]]: Justifies using Supabase CLI migrations for version control and auditability

## Deliverables

1. **8 migration files** in `supabase/migrations/` with all table definitions, constraints, seed data, trigger, and RLS policies
2. **Seeded database**: Default "Test Bolão" league (id=1), ~104 mock World Cup matches, all tables created
3. **Auto-enrollment trigger**: New users automatically enrolled in default league
4. **RLS policies**: All tables protected per specifications
5. **Schema verification**: `supabase db pull` produces valid schema with all tables
6. **Idempotent migrations**: `supabase db reset` works without errors

## Tests

### Unit Tests
- N/A (database schema; no application logic to test)

### Integration Tests
- ✅ Verify all tables exist: Query `information_schema.tables` for all 7 table names
- ✅ Verify seed data: `SELECT COUNT(*) FROM leagues;` → 1; `SELECT COUNT(*) FROM matches;` → ~104
- ✅ Verify default league: `SELECT * FROM leagues WHERE id = '00000000-0000-0000-0000-000000000001';` → name='Test Bolão'
- ✅ Verify auto-enroll trigger: Create test user via Supabase Auth → query `league_members` → user should be in league_id=1
- ✅ Verify RLS policies: Create two test users A and B; user A should NOT be able to query user B's predictions (query from user A's session should return empty)
- ✅ Verify foreign keys: Insert prediction with invalid match_id → should fail with FK constraint error
- ✅ Verify migrations are reversible: `supabase db reset` → apply migrations again → schema should match
- ✅ Test idempotency: Run `supabase db push` twice → second run should report no changes

## Success Criteria

- ✅ All 8 migration files exist in `supabase/migrations/` with correct naming convention
- ✅ `supabase db push` completes without errors
- ✅ All 7 tables exist in database (verified via Supabase Studio or SQL query)
- ✅ Default "Test Bolão" league is seeded with correct id and access_type
- ✅ ~104 mock World Cup matches are seeded (verified via `SELECT COUNT(*) FROM matches;`)
- ✅ Auto-enrollment trigger works: New user created via Supabase Auth → trigger em `auth.users` dispara → aparece em `public.users` E em `league_members` com league_id=1
- ✅ RLS policies are enforced: User A cannot read user B's predictions via SQL query as user A
- ✅ Migrations are idempotent: `supabase db reset` completes without errors
- ✅ All foreign key constraints are in place
- ✅ Schema matches TechSpec definitions exactly (no deviations)
- ✅ `updated_at` é auto-atualizado em UPDATE para `predictions` e `champion_bets` (verify: UPDATE a prediction → `updated_at` changes)
- ✅ RLS SQL exato foi implementado conforme especificado no requisito 4 (não prosa genérica)
- ✅ Trigger está em `auth.users`, não em `public.users` (verificar com `\d+ auth.users` no psql)
