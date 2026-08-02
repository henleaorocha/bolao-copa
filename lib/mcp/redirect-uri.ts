// Validação de redirect_uri usada no Dynamic Client Registration.
//
// Fica isolada da rota para ser testável: é a regra que decide para onde um
// authorization code pode ser entregue, então merece teste próprio.

// Esquemas que nunca podem receber um authorization code: são vetores de
// execução de script / leitura local se um dia forem abertos por um navegador.
const FORBIDDEN_SCHEMES = new Set([
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'blob:',
])

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/**
 * Um redirect_uri é aceitável se for HTTPS, HTTP em loopback (clientes de linha
 * de comando abrem um servidor local para receber o code) ou um esquema próprio
 * de aplicativo desktop. Fragmento é proibido pela RFC 6749 §3.1.2.
 */
export function isAcceptableRedirectUri(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.hash) return false
  if (FORBIDDEN_SCHEMES.has(url.protocol)) return false
  if (url.protocol === 'https:') return true
  if (url.protocol === 'http:') return isLoopback(url.hostname)

  // Esquema de aplicativo (ex.: "claude://..."). Aceito por não ser web-executável.
  return /^[a-z][a-z0-9+.-]*:$/.test(url.protocol)
}
