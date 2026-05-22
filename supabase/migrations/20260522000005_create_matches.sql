-- Tabela de partidas
CREATE TABLE IF NOT EXISTS public.matches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team  TEXT        NOT NULL,
  away_team  TEXT        NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  phase      TEXT        NOT NULL CHECK (phase IN ('group','32nd','16th','8th','4th','semi','3rd_place','final')),
  "group"    TEXT,
  status     TEXT        NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished')),
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: ~104 partidas placeholder da Copa do Mundo 2026
-- 72 jogos da fase de grupos (12 grupos × 6 jogos round-robin) + 32 eliminatórias = 104
-- Dados fictícios para validação de estrutura; substituídos via API Football no PRD 3.
INSERT INTO public.matches (home_team, away_team, match_date, phase, "group") VALUES

-- GRUPO A: BRA, ARG, FRA, GER
('BRA', 'ARG', '2026-06-11 18:00:00+00', 'group', 'A'),
('BRA', 'FRA', '2026-06-15 15:00:00+00', 'group', 'A'),
('BRA', 'GER', '2026-06-19 12:00:00+00', 'group', 'A'),
('ARG', 'FRA', '2026-06-12 18:00:00+00', 'group', 'A'),
('ARG', 'GER', '2026-06-16 15:00:00+00', 'group', 'A'),
('FRA', 'GER', '2026-06-20 12:00:00+00', 'group', 'A'),

-- GRUPO B: ESP, POR, NED, BEL
('ESP', 'POR', '2026-06-11 21:00:00+00', 'group', 'B'),
('ESP', 'NED', '2026-06-15 18:00:00+00', 'group', 'B'),
('ESP', 'BEL', '2026-06-19 15:00:00+00', 'group', 'B'),
('POR', 'NED', '2026-06-12 21:00:00+00', 'group', 'B'),
('POR', 'BEL', '2026-06-16 18:00:00+00', 'group', 'B'),
('NED', 'BEL', '2026-06-20 15:00:00+00', 'group', 'B'),

-- GRUPO C: ENG, ITA, CRO, SUI
('ENG', 'ITA', '2026-06-12 12:00:00+00', 'group', 'C'),
('ENG', 'CRO', '2026-06-16 12:00:00+00', 'group', 'C'),
('ENG', 'SUI', '2026-06-20 18:00:00+00', 'group', 'C'),
('ITA', 'CRO', '2026-06-13 12:00:00+00', 'group', 'C'),
('ITA', 'SUI', '2026-06-17 12:00:00+00', 'group', 'C'),
('CRO', 'SUI', '2026-06-21 12:00:00+00', 'group', 'C'),

-- GRUPO D: URU, MEX, COL, USA
('URU', 'MEX', '2026-06-12 15:00:00+00', 'group', 'D'),
('URU', 'COL', '2026-06-16 21:00:00+00', 'group', 'D'),
('URU', 'USA', '2026-06-20 21:00:00+00', 'group', 'D'),
('MEX', 'COL', '2026-06-13 15:00:00+00', 'group', 'D'),
('MEX', 'USA', '2026-06-17 15:00:00+00', 'group', 'D'),
('COL', 'USA', '2026-06-21 15:00:00+00', 'group', 'D'),

-- GRUPO E: JPN, KOR, AUS, IRN
('JPN', 'KOR', '2026-06-13 09:00:00+00', 'group', 'E'),
('JPN', 'AUS', '2026-06-17 09:00:00+00', 'group', 'E'),
('JPN', 'IRN', '2026-06-21 09:00:00+00', 'group', 'E'),
('KOR', 'AUS', '2026-06-14 09:00:00+00', 'group', 'E'),
('KOR', 'IRN', '2026-06-18 09:00:00+00', 'group', 'E'),
('AUS', 'IRN', '2026-06-22 09:00:00+00', 'group', 'E'),

-- GRUPO F: SEN, GHA, CMR, MAR
('SEN', 'GHA', '2026-06-13 12:00:00+00', 'group', 'F'),
('SEN', 'CMR', '2026-06-17 18:00:00+00', 'group', 'F'),
('SEN', 'MAR', '2026-06-21 18:00:00+00', 'group', 'F'),
('GHA', 'CMR', '2026-06-14 12:00:00+00', 'group', 'F'),
('GHA', 'MAR', '2026-06-18 18:00:00+00', 'group', 'F'),
('CMR', 'MAR', '2026-06-22 18:00:00+00', 'group', 'F'),

-- GRUPO G: NGA, EGY, ALG, TUN
('NGA', 'EGY', '2026-06-13 18:00:00+00', 'group', 'G'),
('NGA', 'ALG', '2026-06-17 21:00:00+00', 'group', 'G'),
('NGA', 'TUN', '2026-06-21 21:00:00+00', 'group', 'G'),
('EGY', 'ALG', '2026-06-14 18:00:00+00', 'group', 'G'),
('EGY', 'TUN', '2026-06-18 21:00:00+00', 'group', 'G'),
('ALG', 'TUN', '2026-06-22 21:00:00+00', 'group', 'G'),

-- GRUPO H: DEN, SWE, POL, CZE
('DEN', 'SWE', '2026-06-13 21:00:00+00', 'group', 'H'),
('DEN', 'POL', '2026-06-18 12:00:00+00', 'group', 'H'),
('DEN', 'CZE', '2026-06-22 12:00:00+00', 'group', 'H'),
('SWE', 'POL', '2026-06-14 21:00:00+00', 'group', 'H'),
('SWE', 'CZE', '2026-06-19 18:00:00+00', 'group', 'H'),
('POL', 'CZE', '2026-06-23 12:00:00+00', 'group', 'H'),

-- GRUPO I: SRB, GRE, HUN, SVK
('SRB', 'GRE', '2026-06-14 12:00:00+00', 'group', 'I'),
('SRB', 'HUN', '2026-06-18 15:00:00+00', 'group', 'I'),
('SRB', 'SVK', '2026-06-22 15:00:00+00', 'group', 'I'),
('GRE', 'HUN', '2026-06-14 15:00:00+00', 'group', 'I'),
('GRE', 'SVK', '2026-06-19 21:00:00+00', 'group', 'I'),
('HUN', 'SVK', '2026-06-23 15:00:00+00', 'group', 'I'),

-- GRUPO J: CAN, CRC, HON, JAM
('CAN', 'CRC', '2026-06-14 18:00:00+00', 'group', 'J'),
('CAN', 'HON', '2026-06-18 18:00:00+00', 'group', 'J'),
('CAN', 'JAM', '2026-06-22 18:00:00+00', 'group', 'J'),
('CRC', 'HON', '2026-06-15 12:00:00+00', 'group', 'J'),
('CRC', 'JAM', '2026-06-19 09:00:00+00', 'group', 'J'),
('HON', 'JAM', '2026-06-23 18:00:00+00', 'group', 'J'),

-- GRUPO K: QAT, SAU, UAE, BHR
('QAT', 'SAU', '2026-06-15 09:00:00+00', 'group', 'K'),
('QAT', 'UAE', '2026-06-19 15:00:00+00', 'group', 'K'),
('QAT', 'BHR', '2026-06-23 09:00:00+00', 'group', 'K'),
('SAU', 'UAE', '2026-06-15 21:00:00+00', 'group', 'K'),
('SAU', 'BHR', '2026-06-20 09:00:00+00', 'group', 'K'),
('UAE', 'BHR', '2026-06-24 09:00:00+00', 'group', 'K'),

-- GRUPO L: CHN, IND, IDN, THA
('CHN', 'IND', '2026-06-15 12:00:00+00', 'group', 'L'),
('CHN', 'IDN', '2026-06-20 18:00:00+00', 'group', 'L'),
('CHN', 'THA', '2026-06-23 21:00:00+00', 'group', 'L'),
('IND', 'IDN', '2026-06-16 09:00:00+00', 'group', 'L'),
('IND', 'THA', '2026-06-20 09:00:00+00', 'group', 'L'),
('IDN', 'THA', '2026-06-24 12:00:00+00', 'group', 'L'),

-- OITAVAS DE FINAL / ROUND OF 32 (16 partidas, 32 classificados → 16 times)
('W_A',  'R_B2', '2026-06-28 18:00:00+00', '32nd', NULL),
('W_B',  'R_A2', '2026-06-28 21:00:00+00', '32nd', NULL),
('W_C',  'R_D2', '2026-06-29 18:00:00+00', '32nd', NULL),
('W_D',  'R_C2', '2026-06-29 21:00:00+00', '32nd', NULL),
('W_E',  'R_F2', '2026-06-30 18:00:00+00', '32nd', NULL),
('W_F',  'R_E2', '2026-06-30 21:00:00+00', '32nd', NULL),
('W_G',  'R_H2', '2026-07-01 18:00:00+00', '32nd', NULL),
('W_H',  'R_G2', '2026-07-01 21:00:00+00', '32nd', NULL),
('W_I',  'R_J2', '2026-07-02 18:00:00+00', '32nd', NULL),
('W_J',  'R_I2', '2026-07-02 21:00:00+00', '32nd', NULL),
('W_K',  'R_L2', '2026-07-03 18:00:00+00', '32nd', NULL),
('W_L',  'R_K2', '2026-07-03 21:00:00+00', '32nd', NULL),
('T3_1', 'T3_2', '2026-07-04 18:00:00+00', '32nd', NULL),
('T3_3', 'T3_4', '2026-07-04 21:00:00+00', '32nd', NULL),
('T3_5', 'T3_6', '2026-07-05 18:00:00+00', '32nd', NULL),
('T3_7', 'T3_8', '2026-07-05 21:00:00+00', '32nd', NULL),

-- DÉCIMAS DE FINAL / ROUND OF 16 (8 partidas)
('W32_1', 'W32_2', '2026-07-08 18:00:00+00', '16th', NULL),
('W32_3', 'W32_4', '2026-07-08 21:00:00+00', '16th', NULL),
('W32_5', 'W32_6', '2026-07-09 18:00:00+00', '16th', NULL),
('W32_7', 'W32_8', '2026-07-09 21:00:00+00', '16th', NULL),
('W32_9', 'W32_10','2026-07-10 18:00:00+00', '16th', NULL),
('W32_11','W32_12','2026-07-10 21:00:00+00', '16th', NULL),
('W32_13','W32_14','2026-07-11 18:00:00+00', '16th', NULL),
('W32_15','W32_16','2026-07-11 21:00:00+00', '16th', NULL),

-- QUARTAS DE FINAL (4 partidas)
('W16_1', 'W16_2', '2026-07-14 18:00:00+00', '8th', NULL),
('W16_3', 'W16_4', '2026-07-14 21:00:00+00', '8th', NULL),
('W16_5', 'W16_6', '2026-07-15 18:00:00+00', '8th', NULL),
('W16_7', 'W16_8', '2026-07-15 21:00:00+00', '8th', NULL),

-- SEMIFINAIS (2 partidas)
('WQF_1', 'WQF_2', '2026-07-18 18:00:00+00', 'semi', NULL),
('WQF_3', 'WQF_4', '2026-07-19 18:00:00+00', 'semi', NULL),

-- DISPUTA DO 3º LUGAR
('LSF_1', 'LSF_2', '2026-07-22 16:00:00+00', '3rd_place', NULL),

-- FINAL
('WSF_1', 'WSF_2', '2026-07-22 20:00:00+00', 'final', NULL);
