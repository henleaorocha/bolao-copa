-- Tabela de usuários sincronizada com Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY,
  email       TEXT        UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  avatar_color TEXT       DEFAULT '#FFC72C',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
