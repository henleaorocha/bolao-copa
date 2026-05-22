# API Reference — Bolão da Copa 2026

Todos os endpoints retornam JSON com o seguinte envelope:

**Sucesso:**
```json
{ "status": "success", "data": { ... }, "timestamp": "ISO8601" }
```

**Erro:**
```json
{ "status": "error", "error": "mensagem PT-BR", "code": "MACHINE_CODE", "statusCode": 4xx/5xx, "timestamp": "ISO8601" }
```

---

## GET /api/auth/me

Retorna o usuário autenticado e seu contexto de liga.

**Requer autenticação:** Sim (cookie de sessão HTTP-only)

**Resposta 200:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "João Silva",
      "avatar_url": null,
      "avatar_color": "#FFC72C",
      "created_at": "2026-05-22T10:00:00Z"
    },
    "league": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Test Bolão",
      "access_type": "open",
      "logo_url": null,
      "role": "member"
    }
  },
  "timestamp": "2026-05-22T10:00:00Z"
}
```

**Erros:**
| Código HTTP | code | error |
|-------------|------|-------|
| 401 | `SESSION_EXPIRED` | Sessão expirada |
| 500 | `DATABASE_ERROR` | Erro ao buscar dados do usuário |

**Exemplo curl:**
```bash
curl -H "Cookie: sb-<PROJECT_ID>-auth-token=<TOKEN>" \
     https://bolao-copa.vercel.app/api/auth/me
```

---

## POST /api/auth/logout

Encerra a sessão do usuário autenticado.

**Requer autenticação:** Sim

**Headers obrigatórios:** `Content-Type: application/json`

**Resposta 200:**
```json
{ "status": "success", "data": { "ok": true }, "timestamp": "2026-05-22T10:00:00Z" }
```

**Erros:**
| Código HTTP | code | error |
|-------------|------|-------|
| 401 | `SESSION_EXPIRED` | Sessão expirada |
| 403 | `FORBIDDEN` | Origem não permitida |
| 500 | `LOGOUT_FAILED` | Erro ao fazer logout |

**Exemplo curl:**
```bash
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: sb-<PROJECT_ID>-auth-token=<TOKEN>" \
     https://bolao-copa.vercel.app/api/auth/logout
```

---

## GET /api/health

Verifica conectividade com o banco de dados. Endpoint público.

**Requer autenticação:** Não

**Resposta 200:**
```json
{ "status": "success", "data": { "status": "ok", "database": "connected" }, "timestamp": "2026-05-22T10:00:00Z" }
```

**Erros:**
| Código HTTP | code | error |
|-------------|------|-------|
| 503 | `DATABASE_UNAVAILABLE` | Banco de dados indisponível |

**Exemplo curl:**
```bash
curl https://bolao-copa.vercel.app/api/health
```

---

## Códigos de erro

| code | statusCode | Significado |
|------|-----------|-------------|
| `SESSION_EXPIRED` | 401 | Sessão ausente ou expirada |
| `DATABASE_ERROR` | 500 | Falha na consulta ao banco |
| `DATABASE_UNAVAILABLE` | 503 | Banco inacessível |
| `LOGOUT_FAILED` | 500 | Falha ao encerrar sessão |
| `FORBIDDEN` | 403 | Origin não autorizado |
| `INVALID_PARAMS` | 400 | Query params inválidos |
| `INVALID_CONTENT_TYPE` | 400 | Content-Type incorreto |
