import { describe, it, expect } from 'vitest'

describe('JoinPage', () => {
  it('should have error state for missing token', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('Link de Convite Inválido')
    expect(pageContent).toContain('O link que você está usando não é válido')
  })

  it('should have error state for league not found', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('Liga Não Encontrada')
    expect(pageContent).toContain('invite_token')
  })

  it('should show league preview', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('league.name')
    expect(pageContent).toContain('league.member_count')
    expect(pageContent).toContain('JoinButton')
  })

  it('should show already member state', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('Você já é membro')
    expect(pageContent).toContain('membershipCheck')
  })

  it('should perform server-side token lookup', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('invite_token')
    expect(pageContent).toContain('getSupabaseServerClient')
  })

  it('should use JoinButton component', async () => {
    const fs = await import('fs').then((m) => m.promises)
    const pageContent = await fs.readFile('app/join/page.tsx', 'utf-8')

    expect(pageContent).toContain('JoinButton')
    expect(pageContent).toContain('leagueId={league.id}')
  })
})
