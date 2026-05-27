export interface ApiFootballFixture {
  fixture: {
    id: number
    date: string
    venue: { name: string; city: string }
    status: { short: string }
  }
  league: { round: string; group: string | null }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

const LIVE_CODES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP'])
const FINISHED_CODES = new Set(['FT', 'AET', 'PEN'])

export function mapFixtureStatus(code: string): 'scheduled' | 'live' | 'finished' {
  if (LIVE_CODES.has(code)) return 'live'
  if (FINISHED_CODES.has(code)) return 'finished'
  return 'scheduled'
}

export async function fetchWorldCupFixtures(): Promise<ApiFootballFixture[]> {
  const res = await fetch(
    'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
    {
      headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600, tags: ['fixtures'] },
    }
  )

  if (!res.ok) {
    throw new Error(`API Football responded with ${res.status}`)
  }

  const json = await res.json()
  const data: unknown = json.response

  if (!Array.isArray(data)) {
    throw new Error('API Football response is malformed: expected array')
  }

  return data as ApiFootballFixture[]
}
