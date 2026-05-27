-- Seeds Copa do Mundo 2026 group-stage fixtures.
-- All rows carry a `seed_` prefixed external_id so they survive the
-- /api/admin/sync-matches cleanup (which only deletes external_id IS NULL rows).
-- Also includes 4 past-dated matches so deadline-closed (FECHADO) state can be tested.

DELETE FROM public.matches WHERE external_id IS NULL;

INSERT INTO public.matches
  (external_id, home_team, home_flag, away_team, away_flag, match_date, phase, "group", venue, city, status)
VALUES

-- FECHADO test fixtures (past dates for testing deadline-closed state)
('seed_test_1', 'Brasil',    'br', 'Argentina', 'ar', '2026-05-21 18:00:00+00', 'group', 'A', 'MetLife Stadium',   'East Rutherford', 'finished'),
('seed_test_2', 'Espanha',   'es', 'Portugal',  'pt', '2026-05-22 21:00:00+00', 'group', 'B', 'AT&T Stadium',      'Arlington',       'finished'),

-- GRUPO A: Brasil, Argentina, França, Alemanha
('seed_a_1', 'Brasil',    'br', 'França',    'fr', '2026-06-11 18:00:00+00', 'group', 'A', 'MetLife Stadium',      'East Rutherford', 'scheduled'),
('seed_a_2', 'Argentina', 'ar', 'Alemanha',  'de', '2026-06-11 21:00:00+00', 'group', 'A', 'AT&T Stadium',         'Arlington',       'scheduled'),
('seed_a_3', 'Brasil',    'br', 'Alemanha',  'de', '2026-06-15 15:00:00+00', 'group', 'A', 'SoFi Stadium',         'Inglewood',       'scheduled'),
('seed_a_4', 'Argentina', 'ar', 'França',    'fr', '2026-06-15 18:00:00+00', 'group', 'A', 'Hard Rock Stadium',    'Miami Gardens',   'scheduled'),
('seed_a_5', 'Brasil',    'br', 'Argentina', 'ar', '2026-06-19 12:00:00+00', 'group', 'A', 'Estadio Azteca',       'Cidade do México','scheduled'),
('seed_a_6', 'França',    'fr', 'Alemanha',  'de', '2026-06-19 15:00:00+00', 'group', 'A', 'BC Place',             'Vancouver',       'scheduled'),

-- GRUPO B: Espanha, Portugal, Holanda, Bélgica
('seed_b_1', 'Espanha',   'es', 'Portugal',  'pt', '2026-06-11 15:00:00+00', 'group', 'B', 'Estadio BBVA',         'Monterrey',       'scheduled'),
('seed_b_2', 'Holanda',   'nl', 'Bélgica',   'be', '2026-06-12 00:00:00+00', 'group', 'B', 'Levi''s Stadium',      'Santa Clara',     'scheduled'),
('seed_b_3', 'Espanha',   'es', 'Holanda',   'nl', '2026-06-15 21:00:00+00', 'group', 'B', 'Lincoln Financial',    'Philadelphia',    'scheduled'),
('seed_b_4', 'Portugal',  'pt', 'Bélgica',   'be', '2026-06-16 00:00:00+00', 'group', 'B', 'Arrowhead Stadium',    'Kansas City',     'scheduled'),
('seed_b_5', 'Espanha',   'es', 'Bélgica',   'be', '2026-06-19 18:00:00+00', 'group', 'B', 'Gillette Stadium',     'Foxborough',      'scheduled'),
('seed_b_6', 'Portugal',  'pt', 'Holanda',   'nl', '2026-06-19 18:00:00+00', 'group', 'B', 'Rose Bowl',            'Pasadena',        'scheduled'),

-- GRUPO C: Inglaterra, Itália, Croácia, Suíça
('seed_c_1', 'Inglaterra','gb-eng', 'Itália',   'it', '2026-06-12 12:00:00+00', 'group', 'C', 'MetLife Stadium',   'East Rutherford', 'scheduled'),
('seed_c_2', 'Croácia',   'hr', 'Suíça',     'ch', '2026-06-12 21:00:00+00', 'group', 'C', 'AT&T Stadium',         'Arlington',       'scheduled'),
('seed_c_3', 'Inglaterra','gb-eng', 'Croácia',  'hr', '2026-06-16 12:00:00+00', 'group', 'C', 'Hard Rock Stadium',  'Miami Gardens',  'scheduled'),
('seed_c_4', 'Itália',    'it', 'Suíça',     'ch', '2026-06-16 18:00:00+00', 'group', 'C', 'SoFi Stadium',         'Inglewood',       'scheduled'),
('seed_c_5', 'Inglaterra','gb-eng', 'Suíça',    'ch', '2026-06-20 18:00:00+00', 'group', 'C', 'BC Place',           'Vancouver',       'scheduled'),
('seed_c_6', 'Itália',    'it', 'Croácia',   'hr', '2026-06-20 18:00:00+00', 'group', 'C', 'Estadio Azteca',       'Cidade do México','scheduled'),

-- GRUPO D: Uruguai, México, Colômbia, EUA
('seed_d_1', 'Uruguai',   'uy', 'México',    'mx', '2026-06-12 15:00:00+00', 'group', 'D', 'Estadio Azteca',       'Cidade do México','scheduled'),
('seed_d_2', 'Colômbia',  'co', 'EUA',       'us', '2026-06-13 00:00:00+00', 'group', 'D', 'MetLife Stadium',      'East Rutherford', 'scheduled'),
('seed_d_3', 'Uruguai',   'uy', 'Colômbia',  'co', '2026-06-16 21:00:00+00', 'group', 'D', 'SoFi Stadium',         'Inglewood',       'scheduled'),
('seed_d_4', 'México',    'mx', 'EUA',       'us', '2026-06-17 00:00:00+00', 'group', 'D', 'AT&T Stadium',         'Arlington',       'scheduled'),
('seed_d_5', 'Uruguai',   'uy', 'EUA',       'us', '2026-06-20 21:00:00+00', 'group', 'D', 'Hard Rock Stadium',    'Miami Gardens',   'scheduled'),
('seed_d_6', 'México',    'mx', 'Colômbia',  'co', '2026-06-20 21:00:00+00', 'group', 'D', 'Estadio BBVA',         'Monterrey',       'scheduled'),

-- GRUPO E: Japão, Coreia do Sul, Austrália, Irã
('seed_e_1', 'Japão',         'jp', 'Coreia do Sul', 'kr', '2026-06-13 09:00:00+00', 'group', 'E', 'Levi''s Stadium',   'Santa Clara',  'scheduled'),
('seed_e_2', 'Austrália',     'au', 'Irã',           NULL, '2026-06-13 12:00:00+00', 'group', 'E', 'Rose Bowl',         'Pasadena',     'scheduled'),
('seed_e_3', 'Japão',         'jp', 'Austrália',     'au', '2026-06-17 09:00:00+00', 'group', 'E', 'AT&T Stadium',      'Arlington',    'scheduled'),
('seed_e_4', 'Coreia do Sul', 'kr', 'Irã',           NULL, '2026-06-17 12:00:00+00', 'group', 'E', 'MetLife Stadium',   'East Rutherford','scheduled'),
('seed_e_5', 'Japão',         'jp', 'Irã',           NULL, '2026-06-21 09:00:00+00', 'group', 'E', 'Lincoln Financial', 'Philadelphia', 'scheduled'),
('seed_e_6', 'Coreia do Sul', 'kr', 'Austrália',     'au', '2026-06-21 09:00:00+00', 'group', 'E', 'Arrowhead Stadium', 'Kansas City',  'scheduled'),

-- GRUPO F: Senegal, Gana, Camarões, Marrocos
('seed_f_1', 'Senegal',  'sn', 'Gana',    'gh', '2026-06-13 15:00:00+00', 'group', 'F', 'Hard Rock Stadium',    'Miami Gardens',   'scheduled'),
('seed_f_2', 'Camarões', 'cm', 'Marrocos','ma', '2026-06-13 18:00:00+00', 'group', 'F', 'Estadio Azteca',       'Cidade do México','scheduled'),
('seed_f_3', 'Senegal',  'sn', 'Camarões','cm', '2026-06-17 18:00:00+00', 'group', 'F', 'BC Place',             'Vancouver',       'scheduled'),
('seed_f_4', 'Gana',     'gh', 'Marrocos','ma', '2026-06-17 21:00:00+00', 'group', 'F', 'Estadio BBVA',         'Monterrey',       'scheduled'),
('seed_f_5', 'Senegal',  'sn', 'Marrocos','ma', '2026-06-21 18:00:00+00', 'group', 'F', 'Levi''s Stadium',      'Santa Clara',     'scheduled'),
('seed_f_6', 'Gana',     'gh', 'Camarões','cm', '2026-06-21 18:00:00+00', 'group', 'F', 'Rose Bowl',            'Pasadena',        'scheduled'),

-- GRUPO G: Nigéria, Egito, Argélia, Tunísia
('seed_g_1', 'Nigéria',  NULL, 'Egito',   'eg', '2026-06-13 18:00:00+00', 'group', 'G', 'SoFi Stadium',         'Inglewood',       'scheduled'),
('seed_g_2', 'Argélia',  'dz', 'Tunísia', 'tn', '2026-06-13 21:00:00+00', 'group', 'G', 'MetLife Stadium',      'East Rutherford', 'scheduled'),
('seed_g_3', 'Nigéria',  NULL, 'Argélia', 'dz', '2026-06-17 21:00:00+00', 'group', 'G', 'AT&T Stadium',         'Arlington',       'scheduled'),
('seed_g_4', 'Egito',    'eg', 'Tunísia', 'tn', '2026-06-18 00:00:00+00', 'group', 'G', 'Hard Rock Stadium',    'Miami Gardens',   'scheduled'),
('seed_g_5', 'Nigéria',  NULL, 'Tunísia', 'tn', '2026-06-21 21:00:00+00', 'group', 'G', 'Estadio Azteca',       'Cidade do México','scheduled'),
('seed_g_6', 'Egito',    'eg', 'Argélia', 'dz', '2026-06-21 21:00:00+00', 'group', 'G', 'BC Place',             'Vancouver',       'scheduled'),

-- GRUPO H: Dinamarca, Suécia, Polônia, República Tcheca
('seed_h_1', 'Dinamarca',        'dk', 'Suécia',            NULL, '2026-06-13 21:00:00+00', 'group', 'H', 'Lincoln Financial', 'Philadelphia', 'scheduled'),
('seed_h_2', 'Polônia',          NULL, 'República Tcheca',  'cz', '2026-06-14 00:00:00+00', 'group', 'H', 'Arrowhead Stadium', 'Kansas City',  'scheduled'),
('seed_h_3', 'Dinamarca',        'dk', 'Polônia',           NULL, '2026-06-18 12:00:00+00', 'group', 'H', 'Levi''s Stadium',   'Santa Clara',  'scheduled'),
('seed_h_4', 'Suécia',           NULL, 'República Tcheca',  'cz', '2026-06-18 15:00:00+00', 'group', 'H', 'Rose Bowl',         'Pasadena',     'scheduled'),
('seed_h_5', 'Dinamarca',        'dk', 'República Tcheca',  'cz', '2026-06-22 12:00:00+00', 'group', 'H', 'SoFi Stadium',     'Inglewood',    'scheduled'),
('seed_h_6', 'Suécia',           NULL, 'Polônia',           NULL, '2026-06-22 12:00:00+00', 'group', 'H', 'MetLife Stadium',  'East Rutherford','scheduled'),

-- GRUPO I: Sérvia, Grécia, Hungria, Eslováquia
('seed_i_1', 'Sérvia',     NULL, 'Grécia',     NULL, '2026-06-14 12:00:00+00', 'group', 'I', 'AT&T Stadium',      'Arlington',       'scheduled'),
('seed_i_2', 'Hungria',    NULL, 'Eslováquia',  NULL, '2026-06-14 15:00:00+00', 'group', 'I', 'Hard Rock Stadium', 'Miami Gardens',   'scheduled'),
('seed_i_3', 'Sérvia',     NULL, 'Hungria',     NULL, '2026-06-18 15:00:00+00', 'group', 'I', 'Estadio Azteca',    'Cidade do México','scheduled'),
('seed_i_4', 'Grécia',     NULL, 'Eslováquia',  NULL, '2026-06-18 18:00:00+00', 'group', 'I', 'BC Place',          'Vancouver',       'scheduled'),
('seed_i_5', 'Sérvia',     NULL, 'Eslováquia',  NULL, '2026-06-22 15:00:00+00', 'group', 'I', 'Lincoln Financial', 'Philadelphia',    'scheduled'),
('seed_i_6', 'Grécia',     NULL, 'Hungria',     NULL, '2026-06-22 15:00:00+00', 'group', 'I', 'Arrowhead Stadium', 'Kansas City',     'scheduled'),

-- GRUPO J: Canadá, Costa Rica, Honduras, Jamaica
('seed_j_1', 'Canadá',      'ca', 'Costa Rica', NULL, '2026-06-14 18:00:00+00', 'group', 'J', 'Estadio BBVA',      'Monterrey',       'scheduled'),
('seed_j_2', 'Honduras',    'hn', 'Jamaica',    'jm', '2026-06-14 21:00:00+00', 'group', 'J', 'Levi''s Stadium',   'Santa Clara',     'scheduled'),
('seed_j_3', 'Canadá',      'ca', 'Honduras',   'hn', '2026-06-18 18:00:00+00', 'group', 'J', 'Rose Bowl',         'Pasadena',        'scheduled'),
('seed_j_4', 'Costa Rica',  NULL, 'Jamaica',    'jm', '2026-06-18 21:00:00+00', 'group', 'J', 'SoFi Stadium',      'Inglewood',       'scheduled'),
('seed_j_5', 'Canadá',      'ca', 'Jamaica',    'jm', '2026-06-22 18:00:00+00', 'group', 'J', 'MetLife Stadium',   'East Rutherford', 'scheduled'),
('seed_j_6', 'Costa Rica',  NULL, 'Honduras',   'hn', '2026-06-22 18:00:00+00', 'group', 'J', 'AT&T Stadium',      'Arlington',       'scheduled'),

-- GRUPO K: Catar, Arábia Saudita, Emirados Árabes, Bahrein
('seed_k_1', 'Catar',           'qa', 'Arábia Saudita',   'sa', '2026-06-15 09:00:00+00', 'group', 'K', 'Hard Rock Stadium', 'Miami Gardens',  'scheduled'),
('seed_k_2', 'Emirados Árabes', NULL, 'Bahrein',          NULL, '2026-06-15 12:00:00+00', 'group', 'K', 'Estadio Azteca',    'Cidade do México','scheduled'),
('seed_k_3', 'Catar',           'qa', 'Emirados Árabes',  NULL, '2026-06-19 15:00:00+00', 'group', 'K', 'BC Place',          'Vancouver',       'scheduled'),
('seed_k_4', 'Arábia Saudita',  'sa', 'Bahrein',          NULL, '2026-06-19 18:00:00+00', 'group', 'K', 'Lincoln Financial', 'Philadelphia',    'scheduled'),
('seed_k_5', 'Catar',           'qa', 'Bahrein',          NULL, '2026-06-23 09:00:00+00', 'group', 'K', 'Arrowhead Stadium', 'Kansas City',     'scheduled'),
('seed_k_6', 'Arábia Saudita',  'sa', 'Emirados Árabes',  NULL, '2026-06-23 09:00:00+00', 'group', 'K', 'Estadio BBVA',      'Monterrey',       'scheduled'),

-- GRUPO L: China, Índia, Indonésia, Tailândia
('seed_l_1', 'China',     NULL, 'Índia',      NULL, '2026-06-15 12:00:00+00', 'group', 'L', 'Levi''s Stadium',   'Santa Clara',     'scheduled'),
('seed_l_2', 'Indonésia', NULL, 'Tailândia',  NULL, '2026-06-15 15:00:00+00', 'group', 'L', 'Rose Bowl',         'Pasadena',        'scheduled'),
('seed_l_3', 'China',     NULL, 'Indonésia',  NULL, '2026-06-20 18:00:00+00', 'group', 'L', 'SoFi Stadium',      'Inglewood',       'scheduled'),
('seed_l_4', 'Índia',     NULL, 'Tailândia',  NULL, '2026-06-20 09:00:00+00', 'group', 'L', 'MetLife Stadium',   'East Rutherford', 'scheduled'),
('seed_l_5', 'China',     NULL, 'Tailândia',  NULL, '2026-06-23 21:00:00+00', 'group', 'L', 'AT&T Stadium',      'Arlington',       'scheduled'),
('seed_l_6', 'Índia',     NULL, 'Indonésia',  NULL, '2026-06-24 12:00:00+00', 'group', 'L', 'Hard Rock Stadium', 'Miami Gardens',   'scheduled')

ON CONFLICT (external_id) DO NOTHING;
