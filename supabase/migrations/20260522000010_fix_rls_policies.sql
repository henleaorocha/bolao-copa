-- ============================================================
-- Fix: infinite recursion em league_members + policies INSERT
-- ============================================================
-- Problema original: league_members_select consultava league_members
-- dentro de si mesma, causando recursão infinita no PostgreSQL.
--
-- Solução: policy simples auth.uid() = user_id sem auto-referência.
-- Para Foundation isso é suficiente — cada usuário vê só seus registros.
--
-- Também adicionamos INSERT policies para users e league_members,
-- necessárias para o upsert de ensureUserSynced() via cliente anon.
-- ============================================================

-- 1. Remover policy recursiva de league_members
DROP POLICY IF EXISTS "league_members_select" ON public.league_members;

-- 2. Policy correta: sem auto-referência
CREATE POLICY "league_members_select_own" ON public.league_members
  FOR SELECT USING (auth.uid() = user_id);

-- 3. INSERT em users (necessário para upsert do ensureUserSynced)
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. INSERT em league_members (necessário para upsert do ensureUserSynced)
DROP POLICY IF EXISTS "league_members_insert_own" ON public.league_members;
CREATE POLICY "league_members_insert_own" ON public.league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
