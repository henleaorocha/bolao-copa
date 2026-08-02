-- Connector do Claude (MCP): tabelas do Authorization Server OAuth 2.1
--
-- O connector expõe os dados do bolão para o Claude de cada participante. Para
-- isso o app precisa ser um Authorization Server próprio: o Claude não fala com
-- o Google nem com o GoTrue diretamente — ele obtém um token EMITIDO POR NÓS e
-- o apresenta em toda chamada ao /api/mcp.
--
-- Três tabelas, todas escritas exclusivamente pelo service role (as rotas de
-- OAuth rodam no servidor). Nenhum segredo é guardado em claro: client secret,
-- authorization code, access token e refresh token são gravados como SHA-256.
-- Um vazamento de leitura do banco, portanto, não permite se passar por ninguém.

-- ── Clients ──────────────────────────────────────────────────────────────────
-- Preenchida por Dynamic Client Registration (RFC 7591): o Claude se cadastra
-- sozinho na primeira vez que o participante adiciona o connector. Sem isso cada
-- participante teria que colar client_id/secret na mão.
CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  client_id           TEXT        PRIMARY KEY,
  client_secret_hash  TEXT,                        -- NULL em client público (PKCE puro)
  client_name         TEXT,
  redirect_uris       TEXT[]      NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mcp_oauth_clients_redirect_uris_not_empty
    CHECK (array_length(redirect_uris, 1) >= 1)
);

-- ── Authorization codes ──────────────────────────────────────────────────────
-- Vida curta e uso único. `used_at` marca o consumo em vez de apagar a linha:
-- reapresentar um code já usado é sinal de vazamento, e a RFC 6749 §10.5 manda
-- revogar os tokens derivados dele — só dá para fazer isso se a linha persistir.
CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
  code_hash             TEXT        PRIMARY KEY,
  client_id             TEXT        NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redirect_uri          TEXT        NOT NULL,
  code_challenge        TEXT        NOT NULL,      -- PKCE obrigatório (OAuth 2.1)
  code_challenge_method TEXT        NOT NULL DEFAULT 'S256'
    CHECK (code_challenge_method = 'S256'),        -- 'plain' recusado de propósito
  scope                 TEXT        NOT NULL DEFAULT 'bolao:read',
  resource              TEXT,                      -- RFC 8707, ecoado no token
  expires_at            TIMESTAMPTZ NOT NULL,
  used_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expires_at
  ON public.mcp_oauth_codes(expires_at);

-- ── Tokens ───────────────────────────────────────────────────────────────────
-- Um par access/refresh por autorização. O refresh rotaciona a cada uso (a linha
-- é atualizada), então o hash antigo deixa de valer sozinho.
CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_hash   TEXT        NOT NULL UNIQUE,
  refresh_token_hash  TEXT        UNIQUE,
  client_id           TEXT        NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope               TEXT        NOT NULL DEFAULT 'bolao:read',
  access_expires_at   TIMESTAMPTZ NOT NULL,
  refresh_expires_at  TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user_id
  ON public.mcp_oauth_tokens(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Padrão: negado. O service role ignora RLS e é o único que escreve. As duas
-- policies abaixo existem para uma futura tela de "conectores autorizados":
-- o participante enxerga e revoga as próprias conexões, e só as dele.
--
-- Note que NÃO há policy alguma em mcp_oauth_clients e mcp_oauth_codes: mesmo
-- autenticado, ninguém lê hashes de segredo pelo PostgREST.
ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_tokens  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mcp_oauth_tokens_select_own" ON public.mcp_oauth_tokens;
CREATE POLICY "mcp_oauth_tokens_select_own" ON public.mcp_oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mcp_oauth_tokens_delete_own" ON public.mcp_oauth_tokens;
CREATE POLICY "mcp_oauth_tokens_delete_own" ON public.mcp_oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.mcp_oauth_tokens IS
  'Tokens do connector MCP do Claude. Guarda apenas SHA-256 dos tokens; o valor em claro só existe na resposta do /api/oauth/token.';
