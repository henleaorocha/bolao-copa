-- Replaces placeholder seed data with the real Copa do Mundo 2026 group-stage
-- schedule (72 matches, 12 groups × 6 matches each).
-- All rows use external_id prefix 'copa26_' so they survive the sync-matches
-- cleanup and are identifiable as official schedule data.
-- Sources: FIFA, NBC Sports, Al Jazeera, Sky Sports (verified May 2026).

DELETE FROM public.matches WHERE external_id LIKE 'seed_%';

INSERT INTO public.matches
  (external_id, home_team, home_flag, away_team, away_flag,
   match_date, phase, "group", venue, city, status)
VALUES

-- ══════════════════════════════════════════════════════
-- GRUPO A: México · África do Sul · Coreia do Sul · República Tcheca
-- ══════════════════════════════════════════════════════
('copa26_001', 'México',           'mx',     'África do Sul',     'za',  '2026-06-11 19:00:00+00', 'group', 'A', 'Estadio Azteca',         'Cidade do México', 'scheduled'),
('copa26_002', 'Coreia do Sul',    'kr',     'República Tcheca',  'cz',  '2026-06-12 02:00:00+00', 'group', 'A', 'Estadio Akron',          'Guadalajara',      'scheduled'),
('copa26_003', 'República Tcheca', 'cz',     'África do Sul',     'za',  '2026-06-18 16:00:00+00', 'group', 'A', 'Mercedes-Benz Stadium',  'Atlanta',          'scheduled'),
('copa26_004', 'México',           'mx',     'Coreia do Sul',     'kr',  '2026-06-19 01:00:00+00', 'group', 'A', 'Estadio Akron',          'Guadalajara',      'scheduled'),
('copa26_005', 'República Tcheca', 'cz',     'México',            'mx',  '2026-06-25 01:00:00+00', 'group', 'A', 'Estadio Azteca',         'Cidade do México', 'scheduled'),
('copa26_006', 'África do Sul',    'za',     'Coreia do Sul',     'kr',  '2026-06-25 01:00:00+00', 'group', 'A', 'Estadio BBVA',           'Monterrey',        'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO B: Canadá · Bósnia e Herzegovina · Catar · Suíça
-- ══════════════════════════════════════════════════════
('copa26_007', 'Canadá',               'ca',  'Bósnia e Herzegovina', 'ba',  '2026-06-12 19:00:00+00', 'group', 'B', 'BMO Field',     'Toronto',     'scheduled'),
('copa26_008', 'Catar',                'qa',  'Suíça',                'ch',  '2026-06-13 19:00:00+00', 'group', 'B', 'Levi''s Stadium','Santa Clara', 'scheduled'),
('copa26_009', 'Suíça',                'ch',  'Bósnia e Herzegovina', 'ba',  '2026-06-18 19:00:00+00', 'group', 'B', 'SoFi Stadium',  'Inglewood',   'scheduled'),
('copa26_010', 'Canadá',               'ca',  'Catar',                'qa',  '2026-06-18 22:00:00+00', 'group', 'B', 'BC Place',      'Vancouver',   'scheduled'),
('copa26_011', 'Suíça',                'ch',  'Canadá',               'ca',  '2026-06-24 19:00:00+00', 'group', 'B', 'BC Place',      'Vancouver',   'scheduled'),
('copa26_012', 'Bósnia e Herzegovina', 'ba',  'Catar',                'qa',  '2026-06-24 19:00:00+00', 'group', 'B', 'Lumen Field',   'Seattle',     'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO C: Brasil · Marrocos · Haiti · Escócia
-- ══════════════════════════════════════════════════════
('copa26_013', 'Brasil',   'br',     'Marrocos', 'ma',     '2026-06-13 22:00:00+00', 'group', 'C', 'MetLife Stadium',        'East Rutherford', 'scheduled'),
('copa26_014', 'Haiti',    'ht',     'Escócia',  'gb-sct', '2026-06-14 01:00:00+00', 'group', 'C', 'Gillette Stadium',       'Foxborough',      'scheduled'),
('copa26_015', 'Escócia',  'gb-sct', 'Marrocos', 'ma',     '2026-06-19 22:00:00+00', 'group', 'C', 'Gillette Stadium',       'Foxborough',      'scheduled'),
('copa26_016', 'Brasil',   'br',     'Haiti',    'ht',     '2026-06-20 01:00:00+00', 'group', 'C', 'Lincoln Financial Field', 'Philadelphia',   'scheduled'),
('copa26_017', 'Escócia',  'gb-sct', 'Brasil',   'br',     '2026-06-24 22:00:00+00', 'group', 'C', 'Hard Rock Stadium',      'Miami Gardens',   'scheduled'),
('copa26_018', 'Marrocos', 'ma',     'Haiti',    'ht',     '2026-06-24 22:00:00+00', 'group', 'C', 'Mercedes-Benz Stadium',  'Atlanta',         'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO D: EUA · Paraguai · Austrália · Turquia
-- ══════════════════════════════════════════════════════
('copa26_019', 'EUA',       'us',  'Paraguai',  'py',  '2026-06-13 01:00:00+00', 'group', 'D', 'SoFi Stadium',    'Inglewood',   'scheduled'),
('copa26_020', 'Austrália', 'au',  'Turquia',   'tr',  '2026-06-14 04:00:00+00', 'group', 'D', 'BC Place',        'Vancouver',   'scheduled'),
('copa26_021', 'EUA',       'us',  'Austrália', 'au',  '2026-06-19 19:00:00+00', 'group', 'D', 'Lumen Field',     'Seattle',     'scheduled'),
('copa26_022', 'Turquia',   'tr',  'Paraguai',  'py',  '2026-06-20 04:00:00+00', 'group', 'D', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),
('copa26_023', 'Turquia',   'tr',  'EUA',       'us',  '2026-06-26 02:00:00+00', 'group', 'D', 'SoFi Stadium',    'Inglewood',   'scheduled'),
('copa26_024', 'Paraguai',  'py',  'Austrália', 'au',  '2026-06-26 02:00:00+00', 'group', 'D', 'Levi''s Stadium', 'Santa Clara', 'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO E: Alemanha · Curaçao · Costa do Marfim · Equador
-- ══════════════════════════════════════════════════════
('copa26_025', 'Alemanha',        'de',  'Curaçao',         'cw',  '2026-06-14 17:00:00+00', 'group', 'E', 'NRG Stadium',             'Houston',      'scheduled'),
('copa26_026', 'Costa do Marfim', 'ci',  'Equador',         'ec',  '2026-06-14 23:00:00+00', 'group', 'E', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('copa26_027', 'Alemanha',        'de',  'Costa do Marfim', 'ci',  '2026-06-20 20:00:00+00', 'group', 'E', 'BMO Field',               'Toronto',      'scheduled'),
('copa26_028', 'Equador',         'ec',  'Curaçao',         'cw',  '2026-06-21 00:00:00+00', 'group', 'E', 'Arrowhead Stadium',       'Kansas City',  'scheduled'),
('copa26_029', 'Equador',         'ec',  'Alemanha',        'de',  '2026-06-25 20:00:00+00', 'group', 'E', 'MetLife Stadium',         'East Rutherford','scheduled'),
('copa26_030', 'Curaçao',         'cw',  'Costa do Marfim', 'ci',  '2026-06-25 20:00:00+00', 'group', 'E', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO F: Holanda · Japão · Suécia · Tunísia
-- ══════════════════════════════════════════════════════
('copa26_031', 'Holanda', 'nl',  'Japão',   'jp',  '2026-06-14 20:00:00+00', 'group', 'F', 'AT&T Stadium',      'Arlington',   'scheduled'),
('copa26_032', 'Suécia',  'se',  'Tunísia', 'tn',  '2026-06-15 02:00:00+00', 'group', 'F', 'Estadio BBVA',      'Monterrey',   'scheduled'),
('copa26_033', 'Holanda', 'nl',  'Suécia',  'se',  '2026-06-20 17:00:00+00', 'group', 'F', 'NRG Stadium',       'Houston',     'scheduled'),
('copa26_034', 'Tunísia', 'tn',  'Japão',   'jp',  '2026-06-21 04:00:00+00', 'group', 'F', 'Estadio BBVA',      'Monterrey',   'scheduled'),
('copa26_035', 'Japão',   'jp',  'Suécia',  'se',  '2026-06-25 23:00:00+00', 'group', 'F', 'AT&T Stadium',      'Arlington',   'scheduled'),
('copa26_036', 'Tunísia', 'tn',  'Holanda', 'nl',  '2026-06-25 23:00:00+00', 'group', 'F', 'Arrowhead Stadium', 'Kansas City', 'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO G: Bélgica · Egito · Irã · Nova Zelândia
-- ══════════════════════════════════════════════════════
('copa26_037', 'Bélgica',       'be',  'Egito',        'eg',  '2026-06-15 19:00:00+00', 'group', 'G', 'Lumen Field',  'Seattle',     'scheduled'),
('copa26_038', 'Irã',           'ir',  'Nova Zelândia', 'nz', '2026-06-16 01:00:00+00', 'group', 'G', 'SoFi Stadium', 'Inglewood',   'scheduled'),
('copa26_039', 'Bélgica',       'be',  'Irã',           'ir', '2026-06-21 19:00:00+00', 'group', 'G', 'SoFi Stadium', 'Inglewood',   'scheduled'),
('copa26_040', 'Nova Zelândia', 'nz',  'Egito',         'eg', '2026-06-22 01:00:00+00', 'group', 'G', 'BC Place',     'Vancouver',   'scheduled'),
('copa26_041', 'Nova Zelândia', 'nz',  'Bélgica',       'be', '2026-06-27 03:00:00+00', 'group', 'G', 'BC Place',     'Vancouver',   'scheduled'),
('copa26_042', 'Egito',         'eg',  'Irã',           'ir', '2026-06-27 03:00:00+00', 'group', 'G', 'Lumen Field',  'Seattle',     'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO H: Espanha · Cabo Verde · Arábia Saudita · Uruguai
-- ══════════════════════════════════════════════════════
('copa26_043', 'Espanha',        'es',  'Cabo Verde',     'cv',  '2026-06-15 16:00:00+00', 'group', 'H', 'Mercedes-Benz Stadium', 'Atlanta',      'scheduled'),
('copa26_044', 'Arábia Saudita', 'sa',  'Uruguai',        'uy',  '2026-06-15 22:00:00+00', 'group', 'H', 'Hard Rock Stadium',     'Miami Gardens','scheduled'),
('copa26_045', 'Espanha',        'es',  'Arábia Saudita', 'sa',  '2026-06-21 16:00:00+00', 'group', 'H', 'Mercedes-Benz Stadium', 'Atlanta',      'scheduled'),
('copa26_046', 'Uruguai',        'uy',  'Cabo Verde',     'cv',  '2026-06-21 22:00:00+00', 'group', 'H', 'Hard Rock Stadium',     'Miami Gardens','scheduled'),
('copa26_047', 'Cabo Verde',     'cv',  'Arábia Saudita', 'sa',  '2026-06-27 00:00:00+00', 'group', 'H', 'NRG Stadium',           'Houston',      'scheduled'),
('copa26_048', 'Uruguai',        'uy',  'Espanha',        'es',  '2026-06-27 00:00:00+00', 'group', 'H', 'Estadio Akron',         'Guadalajara',  'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO I: França · Senegal · Iraque · Noruega
-- ══════════════════════════════════════════════════════
('copa26_049', 'França',  'fr',  'Senegal', 'sn',  '2026-06-16 19:00:00+00', 'group', 'I', 'MetLife Stadium',  'East Rutherford', 'scheduled'),
('copa26_050', 'Iraque',  'iq',  'Noruega', 'no',  '2026-06-16 22:00:00+00', 'group', 'I', 'Gillette Stadium', 'Foxborough',      'scheduled'),
('copa26_051', 'França',  'fr',  'Iraque',  'iq',  '2026-06-22 21:00:00+00', 'group', 'I', 'Lincoln Financial Field', 'Philadelphia', 'scheduled'),
('copa26_052', 'Noruega', 'no',  'Senegal', 'sn',  '2026-06-23 00:00:00+00', 'group', 'I', 'MetLife Stadium',  'East Rutherford', 'scheduled'),
('copa26_053', 'Noruega', 'no',  'França',  'fr',  '2026-06-26 19:00:00+00', 'group', 'I', 'Gillette Stadium', 'Foxborough',      'scheduled'),
('copa26_054', 'Senegal', 'sn',  'Iraque',  'iq',  '2026-06-26 19:00:00+00', 'group', 'I', 'BMO Field',        'Toronto',         'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO J: Argentina · Argélia · Áustria · Jordânia
-- ══════════════════════════════════════════════════════
('copa26_055', 'Argentina', 'ar',  'Argélia',  'dz',  '2026-06-17 01:00:00+00', 'group', 'J', 'Arrowhead Stadium', 'Kansas City',  'scheduled'),
('copa26_056', 'Áustria',   'at',  'Jordânia', 'jo',  '2026-06-17 04:00:00+00', 'group', 'J', 'Levi''s Stadium',   'Santa Clara',  'scheduled'),
('copa26_057', 'Argentina', 'ar',  'Áustria',  'at',  '2026-06-22 17:00:00+00', 'group', 'J', 'AT&T Stadium',      'Arlington',    'scheduled'),
('copa26_058', 'Jordânia',  'jo',  'Argélia',  'dz',  '2026-06-23 03:00:00+00', 'group', 'J', 'Levi''s Stadium',   'Santa Clara',  'scheduled'),
('copa26_059', 'Argélia',   'dz',  'Áustria',  'at',  '2026-06-28 02:00:00+00', 'group', 'J', 'Arrowhead Stadium', 'Kansas City',  'scheduled'),
('copa26_060', 'Jordânia',  'jo',  'Argentina','ar',  '2026-06-28 02:00:00+00', 'group', 'J', 'AT&T Stadium',      'Arlington',    'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO K: Portugal · Rep. Democrática do Congo · Uzbequistão · Colômbia
-- ══════════════════════════════════════════════════════
('copa26_061', 'Portugal',                    'pt',  'Rep. Democrática do Congo', 'cd',  '2026-06-17 17:00:00+00', 'group', 'K', 'NRG Stadium',           'Houston',     'scheduled'),
('copa26_062', 'Uzbequistão',                 'uz',  'Colômbia',                  'co',  '2026-06-18 02:00:00+00', 'group', 'K', 'Estadio Azteca',        'Cidade do México','scheduled'),
('copa26_063', 'Portugal',                    'pt',  'Uzbequistão',               'uz',  '2026-06-23 17:00:00+00', 'group', 'K', 'NRG Stadium',           'Houston',     'scheduled'),
('copa26_064', 'Colômbia',                    'co',  'Rep. Democrática do Congo', 'cd',  '2026-06-24 02:00:00+00', 'group', 'K', 'Estadio Akron',         'Guadalajara', 'scheduled'),
('copa26_065', 'Colômbia',                    'co',  'Portugal',                  'pt',  '2026-06-27 23:30:00+00', 'group', 'K', 'Hard Rock Stadium',     'Miami Gardens','scheduled'),
('copa26_066', 'Rep. Democrática do Congo',   'cd',  'Uzbequistão',               'uz',  '2026-06-27 23:30:00+00', 'group', 'K', 'Mercedes-Benz Stadium', 'Atlanta',     'scheduled'),

-- ══════════════════════════════════════════════════════
-- GRUPO L: Inglaterra · Croácia · Gana · Panamá
-- ══════════════════════════════════════════════════════
('copa26_067', 'Inglaterra', 'gb-eng', 'Croácia', 'hr',  '2026-06-17 20:00:00+00', 'group', 'L', 'AT&T Stadium',            'Arlington',       'scheduled'),
('copa26_068', 'Gana',       'gh',     'Panamá',  'pa',  '2026-06-17 23:00:00+00', 'group', 'L', 'BMO Field',               'Toronto',         'scheduled'),
('copa26_069', 'Inglaterra', 'gb-eng', 'Gana',    'gh',  '2026-06-23 20:00:00+00', 'group', 'L', 'Gillette Stadium',        'Foxborough',      'scheduled'),
('copa26_070', 'Panamá',     'pa',     'Croácia', 'hr',  '2026-06-23 23:00:00+00', 'group', 'L', 'BMO Field',               'Toronto',         'scheduled'),
('copa26_071', 'Panamá',     'pa',     'Inglaterra','gb-eng','2026-06-27 21:00:00+00','group','L', 'MetLife Stadium',         'East Rutherford', 'scheduled'),
('copa26_072', 'Croácia',    'hr',     'Gana',    'gh',  '2026-06-27 21:00:00+00', 'group', 'L', 'Lincoln Financial Field', 'Philadelphia',    'scheduled')

ON CONFLICT (external_id) DO NOTHING;
