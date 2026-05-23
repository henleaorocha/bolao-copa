// ─────────────────────────────────────────────────────────────
// DADOS SIMULADOS — Bolão Copa do Mundo 2026
// 48 seleções, 12 grupos. Grupos A, C e L são oficiais
// (conforme arquivo de referência). Demais grupos foram
// simulados para o protótipo.
// ─────────────────────────────────────────────────────────────

// Códigos de bandeira por país (emoji - usado como fallback visual)
const TEAM_FLAGS = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪',
  'Espanha': '🇪🇸', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹', 'Holanda': '🇳🇱',
  'Itália': '🇮🇹', 'Bélgica': '🇧🇪', 'Uruguai': '🇺🇾', 'Colômbia': '🇨🇴',
  'México': '🇲🇽', 'EUA': '🇺🇸', 'Canadá': '🇨🇦', 'África do Sul': '🇿🇦',
  'Coreia do Sul': '🇰🇷', 'República Tcheca': '🇨🇿', 'Equador': '🇪🇨',
  'Nova Zelândia': '🇳🇿', 'Marrocos': '🇲🇦', 'Haiti': '🇭🇹', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal': '🇸🇳', 'Uzbequistão': '🇺🇿', 'Catar': '🇶🇦', 'Egito': '🇪🇬',
  'Tunísia': '🇹🇳', 'Curaçao': '🇨🇼', 'Áustria': '🇦🇹', 'Jamaica': '🇯🇲',
  'Suíça': '🇨🇭', 'Camarões': '🇨🇲', 'Bolívia': '🇧🇴', 'Costa do Marfim': '🇨🇮',
  'Cabo Verde': '🇨🇻', 'Croácia': '🇭🇷', 'Gana': '🇬🇭', 'Panamá': '🇵🇦',
  'Arábia Saudita': '🇸🇦', 'Honduras': '🇭🇳', 'Japão': '🇯🇵', 'Noruega': '🇳🇴',
  'Jordânia': '🇯🇴', 'Dinamarca': '🇩🇰', 'Austrália': '🇦🇺', 'Paraguai': '🇵🇾',
  'Argélia': '🇩🇿',
};

// Cores oficiais (aproximadas) de cada seleção - para fallback de bandeira
const TEAM_COLORS = {
  'Brasil': ['#FEDF00', '#009C3B'], 'Argentina': ['#75AADB', '#FFFFFF'],
  'França': ['#002395', '#FFFFFF', '#ED2939'], 'Alemanha': ['#000000', '#DD0000', '#FFCE00'],
  'Espanha': ['#AA151B', '#F1BF00'], 'Inglaterra': ['#FFFFFF', '#CE1124'],
  'Portugal': ['#046A38', '#DA291C'], 'Holanda': ['#FF6900', '#FFFFFF'],
  'Itália': ['#008C45', '#FFFFFF', '#CD212A'], 'Bélgica': ['#000000', '#FAE042', '#ED2939'],
  'Uruguai': ['#0038A8', '#FFFFFF'], 'Colômbia': ['#FCD116', '#003893', '#CE1126'],
  'México': ['#006847', '#FFFFFF', '#CE1126'], 'EUA': ['#3C3B6E', '#FFFFFF', '#B22234'],
  'Canadá': ['#FF0000', '#FFFFFF'], 'África do Sul': ['#007749', '#FFB81C', '#001489'],
  'Coreia do Sul': ['#FFFFFF', '#003478', '#C60C30'], 'República Tcheca': ['#FFFFFF', '#11457E', '#D7141A'],
  'Equador': ['#FFD100', '#0033A0', '#EF3340'], 'Nova Zelândia': ['#012169', '#FFFFFF', '#C8102E'],
  'Marrocos': ['#C1272D', '#006233'], 'Haiti': ['#00209F', '#D21034'],
  'Escócia': ['#0065BD', '#FFFFFF'], 'Senegal': ['#00853F', '#FDEF42', '#E31B23'],
  'Uzbequistão': ['#1EB53A', '#FFFFFF', '#0099B5'], 'Catar': ['#8A1538', '#FFFFFF'],
  'Egito': ['#CE1126', '#FFFFFF', '#000000'], 'Tunísia': ['#E70013', '#FFFFFF'],
  'Curaçao': ['#002B7F', '#F9E814', '#FFFFFF'], 'Áustria': ['#ED2939', '#FFFFFF'],
  'Jamaica': ['#009B3A', '#FED100', '#000000'], 'Suíça': ['#FF0000', '#FFFFFF'],
  'Camarões': ['#007A5E', '#CE1126', '#FCD116'], 'Bolívia': ['#D52B1E', '#F4E400', '#007934'],
  'Costa do Marfim': ['#F77F00', '#FFFFFF', '#009E60'], 'Cabo Verde': ['#003893', '#FFFFFF', '#CF2027'],
  'Croácia': ['#FFFFFF', '#FF0000', '#0093DD'], 'Gana': ['#CE1126', '#FCD116', '#006B3F'],
  'Panamá': ['#005AA7', '#FFFFFF', '#D21034'], 'Arábia Saudita': ['#006C35', '#FFFFFF'],
  'Honduras': ['#0073CF', '#FFFFFF'], 'Japão': ['#FFFFFF', '#BC002D'],
  'Noruega': ['#BA0C2F', '#FFFFFF', '#00205B'], 'Jordânia': ['#000000', '#FFFFFF', '#007A3D', '#CE1126'],
  'Dinamarca': ['#C8102E', '#FFFFFF'], 'Austrália': ['#012169', '#FFFFFF', '#E4002B'],
  'Paraguai': ['#D52B1E', '#FFFFFF', '#0038A8'], 'Argélia': ['#006233', '#FFFFFF', '#D21034'],
};

const TEAM_CODES = {
  'Brasil': 'BRA', 'Argentina': 'ARG', 'França': 'FRA', 'Alemanha': 'ALE',
  'Espanha': 'ESP', 'Inglaterra': 'ING', 'Portugal': 'POR', 'Holanda': 'HOL',
  'Itália': 'ITA', 'Bélgica': 'BEL', 'Uruguai': 'URU', 'Colômbia': 'COL',
  'México': 'MEX', 'EUA': 'USA', 'Canadá': 'CAN', 'África do Sul': 'RSA',
  'Coreia do Sul': 'COR', 'República Tcheca': 'TCH', 'Equador': 'EQU',
  'Nova Zelândia': 'NZL', 'Marrocos': 'MAR', 'Haiti': 'HAI', 'Escócia': 'ESC',
  'Senegal': 'SEN', 'Uzbequistão': 'UZB', 'Catar': 'QAT', 'Egito': 'EGI',
  'Tunísia': 'TUN', 'Curaçao': 'CUR', 'Áustria': 'AUT', 'Jamaica': 'JAM',
  'Suíça': 'SUI', 'Camarões': 'CAM', 'Bolívia': 'BOL', 'Costa do Marfim': 'CIV',
  'Cabo Verde': 'CPV', 'Croácia': 'CRO', 'Gana': 'GHA', 'Panamá': 'PAN',
  'Arábia Saudita': 'ARA', 'Honduras': 'HON', 'Japão': 'JAP', 'Noruega': 'NOR',
  'Jordânia': 'JOR', 'Dinamarca': 'DIN', 'Austrália': 'AUS', 'Paraguai': 'PAR',
  'Argélia': 'ALG',
};

// 12 Grupos (A, C e L oficiais — demais simulados)
const MOCK_GROUPS = [
  { name: 'A', teams: ['México', 'África do Sul', 'Coreia do Sul', 'República Tcheca'], official: true },
  { name: 'B', teams: ['Argentina', 'Equador', 'Nova Zelândia', 'Canadá'], official: false },
  { name: 'C', teams: ['Brasil', 'Marrocos', 'Haiti', 'Escócia'], official: true },
  { name: 'D', teams: ['França', 'Senegal', 'Uzbequistão', 'Catar'], official: false },
  { name: 'E', teams: ['Alemanha', 'Egito', 'Tunísia', 'Curaçao'], official: false },
  { name: 'F', teams: ['Espanha', 'EUA', 'Áustria', 'Jamaica'], official: false },
  { name: 'G', teams: ['Portugal', 'Suíça', 'Camarões', 'Bolívia'], official: false },
  { name: 'H', teams: ['Holanda', 'Uruguai', 'Costa do Marfim', 'Cabo Verde'], official: false },
  { name: 'I', teams: ['Itália', 'Bélgica', 'Arábia Saudita', 'Honduras'], official: false },
  { name: 'J', teams: ['Colômbia', 'Japão', 'Noruega', 'Jordânia'], official: false },
  { name: 'K', teams: ['Dinamarca', 'Austrália', 'Paraguai', 'Argélia'], official: false },
  { name: 'L', teams: ['Inglaterra', 'Croácia', 'Gana', 'Panamá'], official: true },
];

// Geração de jogos da Fase de Grupos (round-robin)
// Cada grupo gera 6 jogos = 72 jogos totais. Para o protótipo só mostramos
// os primeiros + alguns destacados.
const PHASE_DATES = {
  rodada1: ['2026-06-11T19:00', '2026-06-12T16:00', '2026-06-13T13:00'],
  rodada2: ['2026-06-16T16:00', '2026-06-17T19:00', '2026-06-18T22:00'],
  rodada3: ['2026-06-22T16:00', '2026-06-23T22:00', '2026-06-25T16:00'],
};

const STADIUMS = [
  'MetLife Stadium · NY', 'AT&T Stadium · Dallas', 'SoFi Stadium · LA',
  'Mercedes-Benz · Atlanta', 'NRG Stadium · Houston', 'Hard Rock · Miami',
  'Estádio Azteca · CDMX', 'Akron · Guadalajara', 'Estádio BBVA · Monterrey',
  'BMO Field · Toronto', 'BC Place · Vancouver', 'Arrowhead · Kansas City',
  'Lincoln Financial · Philadelphia', 'Lumen Field · Seattle',
  'Levi’s Stadium · São Francisco', 'Gillette Stadium · Boston',
];

// Gera jogos round-robin para um grupo de 4 times
function genGroupMatches(groupName, teams, startId) {
  // Padrão FIFA: rodadas (1v2, 3v4), (1v3, 2v4), (1v4, 2v3)
  const rounds = [
    [[0, 1], [2, 3]],
    [[0, 2], [3, 1]],
    [[0, 3], [1, 2]],
  ];
  const matches = [];
  let id = startId;
  const roundKeys = ['rodada1', 'rodada2', 'rodada3'];
  rounds.forEach((round, rIdx) => {
    round.forEach((pair, mIdx) => {
      const dateStr = PHASE_DATES[roundKeys[rIdx]][mIdx % 3];
      matches.push({
        id: id++,
        phase: 'Grupos',
        group: groupName,
        round: rIdx + 1,
        teamA: teams[pair[0]],
        teamB: teams[pair[1]],
        scoreA: null,
        scoreB: null,
        finalA: null, finalB: null,  // resultado real (null pré-jogo)
        date: dateStr,
        stadium: STADIUMS[(id * 7) % STADIUMS.length],
        locked: false,
      });
    });
  });
  return matches;
}

const MOCK_MATCHES = (() => {
  let id = 1;
  const all = [];
  MOCK_GROUPS.forEach(g => {
    const m = genGroupMatches(g.name, g.teams, id);
    all.push(...m);
    id += m.length;
  });
  return all;
})();

// Bracket eliminatório simulado (após fase de grupos)
// Para o protótipo, mostra estrutura vazia "a definir"
const BRACKET_ROUNDS = [
  { id: 'r32', label: '32 avos', short: '1/16', date: '28 jun → 2 jul', count: 16, multiplier: 1.5 },
  { id: 'r16', label: 'Oitavas', short: '1/8', date: '4 → 7 jul', count: 8, multiplier: 2 },
  { id: 'qf', label: 'Quartas', short: '1/4', date: '9 → 11 jul', count: 4, multiplier: 2.5 },
  { id: 'sf', label: 'Semifinal', short: '1/2', date: '14 → 15 jul', count: 2, multiplier: 3 },
  { id: '3rd', label: '3º Lugar', short: '3º', date: '18 jul', count: 1, multiplier: 3.5 },
  { id: 'final', label: 'Final', short: 'F', date: '19 jul · MetLife', count: 1, multiplier: 4 },
];

// Ligas mock
const MOCK_LEAGUES = [
  { id: 1, name: 'Bolão Principal', players: 87, owner: 'Admin', color: '#FFC72C', isPrincipal: true, access: 'open', prize: '1º — Camisa oficial · 2º — Bola oficial · 3º — Caneca' },
  { id: 2, name: 'Liga da TI', players: 14, owner: 'Igor H.', color: '#0097A9', isPrincipal: false, access: 'private', prize: 'R$ 500 pro 1º · Almoço pro 2º' },
  { id: 3, name: 'Galera do Café', players: 6, owner: 'Você', color: '#F46036', isPrincipal: false, access: 'private', prize: null },
];

// Ranking mock (usuário atual = "Igor Henrique")
const MOCK_RANKING = [
  { rank: 1, name: 'Ana Beatriz Lima', points: 0, exactMatches: 0, hits: 0, avatar: 'AB', color: '#FFC72C' },
  { rank: 2, name: 'Rodrigo Mendes', points: 0, exactMatches: 0, hits: 0, avatar: 'RM', color: '#F46036' },
  { rank: 3, name: 'Mariana Costa', points: 0, exactMatches: 0, hits: 0, avatar: 'MC', color: '#0097A9' },
  { rank: 4, name: 'Igor Henrique', points: 0, exactMatches: 0, hits: 0, avatar: 'IH', color: '#7E4FE3', isMe: true },
  { rank: 5, name: 'Felipe Souza', points: 0, exactMatches: 0, hits: 0, avatar: 'FS', color: '#244C5A' },
  { rank: 6, name: 'Camila Rocha', points: 0, exactMatches: 0, hits: 0, avatar: 'CR', color: '#16A34A' },
  { rank: 7, name: 'Lucas Pereira', points: 0, exactMatches: 0, hits: 0, avatar: 'LP', color: '#DC2626' },
  { rank: 8, name: 'Juliana Alves', points: 0, exactMatches: 0, hits: 0, avatar: 'JA', color: '#EA580C' },
];

// Esquema de pontuação
const SCORING = {
  champion: 50,
  runnerUp: 25,
  third: 12,
  groupsExact: 10,
  groupsResult: 5,
  groupsGoals: 2,  // bônus por acertar gols de uma seleção
  multipliers: {
    'Grupos': 1,
    '32 avos': 1.5,
    'Oitavas': 2,
    'Quartas': 2.5,
    'Semifinal': 3,
    '3º Lugar': 3.5,
    'Final': 4,
  },
};

const SCORING_BREAKDOWN = [
  { label: 'Palpite de Campeão', points: 50, icon: 'crown', desc: 'Acertar quem leva a taça' },
  { label: 'Palpite de Vice-Campeão', points: 25, icon: 'medal', desc: 'Acertar quem perde a final' },
  { label: 'Placar Exato (Grupos)', points: 10, icon: 'target', desc: '2x1 = 2x1' },
  { label: 'Vencedor/Empate (Grupos)', points: 5, icon: 'check', desc: 'Sem cravar o placar' },
  { label: 'Multiplicador 32 avos', points: '1.5x', icon: 'trending', desc: 'Sobre pontos da partida' },
  { label: 'Multiplicador Oitavas', points: '2x', icon: 'trending', desc: 'Vale o dobro' },
  { label: 'Multiplicador Quartas', points: '2.5x', icon: 'trending', desc: '' },
  { label: 'Multiplicador Semifinal', points: '3x', icon: 'trending', desc: '' },
  { label: 'Multiplicador Final', points: '4x', icon: 'trending', desc: 'A glória final' },
];

// Top times candidatos a Campeão/Vice (para dropdown de aposta)
const TOP_CANDIDATES = [
  'Brasil', 'Argentina', 'França', 'Espanha', 'Inglaterra', 'Portugal',
  'Alemanha', 'Holanda', 'Itália', 'Bélgica', 'Uruguai', 'Colômbia',
  'México', 'Croácia', 'Marrocos', 'Suíça',
];

Object.assign(window, {
  TEAM_FLAGS, TEAM_COLORS, TEAM_CODES,
  MOCK_GROUPS, MOCK_MATCHES, BRACKET_ROUNDS,
  MOCK_LEAGUES, MOCK_RANKING,
  SCORING, SCORING_BREAKDOWN, TOP_CANDIDATES,
  STADIUMS,
});
