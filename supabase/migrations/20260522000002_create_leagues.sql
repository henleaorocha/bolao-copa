-- Tabela de ligas (bolões)
CREATE TABLE IF NOT EXISTS public.leagues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  access_type TEXT        NOT NULL CHECK (access_type IN ('open', 'private')),
  logo_url    TEXT,
  prize_pool  TEXT,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Liga padrão para testes de Foundation (PRD 1)
INSERT INTO public.leagues (id, name, access_type, created_by)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Bolão', 'open', NULL)
ON CONFLICT (id) DO NOTHING;
