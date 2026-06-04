// EN → PT team-name normalization for the openfootball ingestion adapter.
//
// openfootball emits English team names ("South Korea", "Czech Republic",
// "USA", "Ivory Coast"); the app stores and validates Portuguese names
// (lib/copa-teams.ts, reconciled to seed 020 — ADR-003). This module maps all
// 48 openfootball strings to the canonical PT roster so the adapter, flag
// lookup, and isConfirmedMatchup all agree (ADR-006).
//
// Keys are openfootball's EXACT strings from the pinned fixture
// (tests/fixtures/openfootball-wc2026-teams.json). Values are the PT names from
// ALL_COPA_TEAMS verbatim — notably "DR Congo" → "Rep. Democrática do Congo"
// (seed-020 canonical; the spec's "RD Congo" is only a label) so the value is a
// member of VALID_TEAM_NAMES and resolveFlag/isConfirmedMatchup succeed.

export const OPENFOOTBALL_TO_PT: Record<string, string> = {
  // Group A
  'Mexico': 'México',
  'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul',
  'Czech Republic': 'República Tcheca',
  // Group B
  'Canada': 'Canadá',
  'Bosnia & Herzegovina': 'Bósnia e Herzegovina',
  'Qatar': 'Catar',
  'Switzerland': 'Suíça',
  // Group C
  'Brazil': 'Brasil',
  'Morocco': 'Marrocos',
  'Haiti': 'Haiti',
  'Scotland': 'Escócia',
  // Group D
  'USA': 'EUA',
  'Paraguay': 'Paraguai',
  'Australia': 'Austrália',
  'Turkey': 'Turquia',
  // Group E
  'Germany': 'Alemanha',
  'Curaçao': 'Curaçao',
  'Ivory Coast': 'Costa do Marfim',
  'Ecuador': 'Equador',
  // Group F
  'Netherlands': 'Holanda',
  'Japan': 'Japão',
  'Sweden': 'Suécia',
  'Tunisia': 'Tunísia',
  // Group G
  'Belgium': 'Bélgica',
  'Egypt': 'Egito',
  'Iran': 'Irã',
  'New Zealand': 'Nova Zelândia',
  // Group H
  'Spain': 'Espanha',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arábia Saudita',
  'Uruguay': 'Uruguai',
  // Group I
  'France': 'França',
  'Senegal': 'Senegal',
  'Iraq': 'Iraque',
  'Norway': 'Noruega',
  // Group J
  'Argentina': 'Argentina',
  'Algeria': 'Argélia',
  'Austria': 'Áustria',
  'Jordan': 'Jordânia',
  // Group K
  'Portugal': 'Portugal',
  'DR Congo': 'Rep. Democrática do Congo',
  'Uzbekistan': 'Uzbequistão',
  'Colombia': 'Colômbia',
  // Group L
  'England': 'Inglaterra',
  'Croatia': 'Croácia',
  'Ghana': 'Gana',
  'Panama': 'Panamá',
}

// Map a single openfootball team string to its canonical PT name. Known teams
// resolve to the roster name; placeholders and unknowns ("2A", "W74", "L101",
// "3A/B/C/D/F") pass through unchanged so the gap stays visible rather than
// crashing the adapter (ADR-006 defensive parse).
export function toPtName(name: string): string {
  return OPENFOOTBALL_TO_PT[name] ?? name
}
