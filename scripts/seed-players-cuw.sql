INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Eloy Room',             'GK',  1),
  ('Tyrick Bodak',          'GK',  2),
  ('Trevor Doornbusch',     'GK',  3),
  ('Riechedly Bazoer',      'DEF', 4),
  ('Joshua Brenet',         'DEF', 5),
  ('Roshon van Eijma',      'DEF', 6),
  ('Sherel Floranus',       'DEF', 7),
  ('Deveron Fonville',      'DEF', 8),
  ('Juriën Gaari',          'DEF', 9),
  ('Armando Obispo',        'DEF', 10),
  ('Shurandy Sambo',        'DEF', 11),
  ('Juninho Bacuna',        'MID', 12),
  ('Leandro Bacuna',        'MID', 13),
  ('Livano Comenencia',     'MID', 14),
  ('Kevin Felida',          'MID', 15),
  ('Ar''jany Martha',       'MID', 16),
  ('Tyrese Noslin',         'MID', 17),
  ('Godfried Roemeratoe',   'MID', 18),
  ('Jeremy Antonisse',      'FWD', 19),
  ('Tahith Chong',          'FWD', 20),
  ('Kenji Gorré',           'FWD', 21),
  ('Sontje Hansen',         'FWD', 22),
  ('Gervane Kastaneer',     'FWD', 23),
  ('Brandley Kuwas',        'FWD', 24),
  ('Jürgen Locadia',        'FWD', 25),
  ('Jearl Margaritha',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CUW'
ON CONFLICT DO NOTHING;
