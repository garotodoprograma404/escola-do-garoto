import path from 'node:path'
import type { NextConfig } from 'next'

// Em desenvolvimento o Next repassa /api/* para a API NestJS. Em produção quem faz isso é o proxy
// reverso (infra/Caddyfile.example), que também define o IP real do cliente.
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:3333'

// Hospedagens de imagem permitidas (ex.: IMAGE_HOSTS=cdn.exemplo.com,img.exemplo.com).
const imageHosts = (process.env.IMAGE_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // Os testes de navegador usam outra pasta de build para não brigar com o servidor de desenvolvimento.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Saída enxuta para container (`apps/web/Dockerfile`): servidor Node com só o que a aplicação usa.
  output: 'standalone',
  // Monorepo: o rastreio de arquivos parte da raiz do repositório (workspace `@vox/contracts`).
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  // Origens aceitas pelo servidor de desenvolvimento (sem aviso de origem cruzada)
  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...imageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }]
  },
  headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/redefinir-senha', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
      {
        source: '/auth/reset-password',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ]
  },
}

export default nextConfig
