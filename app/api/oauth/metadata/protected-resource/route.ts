import { MCP_SCOPE, mcpResourceUrl, resolveBaseUrl } from '@/lib/mcp/config'
import { corsPreflight, jsonResponse } from '@/lib/mcp/http'

// OAuth 2.0 Protected Resource Metadata (RFC 9728).
//
// Servido em /.well-known/oauth-protected-resource (e com o caminho do recurso
// como sufixo) via rewrite em next.config.ts. É o primeiro documento que o
// cliente MCP busca depois de tomar um 401: ele diz qual Authorization Server
// emite tokens válidos para /api/mcp.

export async function GET(request: Request) {
  const baseUrl = resolveBaseUrl(request)

  return jsonResponse({
    resource: mcpResourceUrl(baseUrl),
    authorization_servers: [baseUrl],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Bolão da Copa 2026',
    resource_documentation: `${baseUrl}/regras.html`,
  })
}

export async function OPTIONS() {
  return corsPreflight()
}
