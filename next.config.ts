import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Discovery do OAuth do connector MCP.
  //
  // As RFCs 8414 e 9728 fixam os caminhos em /.well-known/... e o cliente monta a
  // URL sozinho — não há como configurar outro lugar. Servimos por rewrite em vez
  // de criar um diretório `app/.well-known/`: o roteamento por diretório iniciado
  // com ponto é frágil (ferramentas de build costumam ignorar dotfiles), enquanto
  // o rewrite é explícito e aponta para Route Handlers comuns.
  //
  // As variantes com sufixo existem porque a RFC 9728 insere o CAMINHO do recurso
  // depois do .well-known: /.well-known/oauth-protected-resource/api/mcp.
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/oauth/metadata/protected-resource',
      },
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        destination: '/api/oauth/metadata/protected-resource',
      },
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/oauth/metadata/authorization-server',
      },
      {
        source: '/.well-known/oauth-authorization-server/:path*',
        destination: '/api/oauth/metadata/authorization-server',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/w80/**",
      },
    ],
  },
};

export default nextConfig;
