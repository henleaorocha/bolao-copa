import { MCP_SCOPE, resolveBaseUrl } from '@/lib/mcp/config'
import { corsPreflight, jsonResponse } from '@/lib/mcp/http'

// OAuth 2.0 Authorization Server Metadata (RFC 8414).
//
// Servido em /.well-known/oauth-authorization-server via rewrite. Com este
// documento o cliente descobre os endpoints sem nenhuma configuração manual do
// participante — inclusive o `registration_endpoint`, que é o que permite ao
// Claude se auto-cadastrar (RFC 7591).

export async function GET(request: Request) {
  const baseUrl = resolveBaseUrl(request)

  return jsonResponse({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    // Só S256: OAuth 2.1 remove `plain`, e a coluna code_challenge_method tem
    // CHECK equivalente, então anunciar outra coisa criaria falha em runtime.
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: [
      'none',
      'client_secret_post',
      'client_secret_basic',
    ],
    revocation_endpoint_auth_methods_supported: [
      'none',
      'client_secret_post',
      'client_secret_basic',
    ],
  })
}

export async function OPTIONS() {
  return corsPreflight()
}
