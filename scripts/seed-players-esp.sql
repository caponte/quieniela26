INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Unai Simón',        'GK',  1),
  ('David Raya',        'GK',  2),
  ('Joan García',       'GK',  3),
  ('Marc Cucurella',    'DEF', 4),
  ('Pau Cubarsí',       'DEF', 5),
  ('Aymeric Laporte',   'DEF', 6),
  ('Álex Grimaldo',     'DEF', 7),
  ('Pedro Porro',       'DEF', 8),
  ('Eric García',       'DEF', 9),
  ('Marcos Llorente',   'DEF', 10),
  ('Marc Pubill',       'DEF', 11),
  ('Gavi',              'MID', 12),
  ('Rodri',             'MID', 13),
  ('Pedri',             'MID', 14),
  ('Martín Zubimendi',  'MID', 15),
  ('Fabián Ruiz',       'MID', 16),
  ('Álex Baena',        'MID', 17),
  ('Mikel Merino',      'MID', 18),
  ('Lamine Yamal',      'FWD', 19),
  ('Nico Williams',     'FWD', 20),
  ('Dani Olmo',         'FWD', 21),
  ('Ferran Torres',     'FWD', 22),
  ('Mikel Oyarzabal',   'FWD', 23),
  ('Yéremy Pino',       'FWD', 24),
  ('Borja Iglesias',    'FWD', 25),
  ('Víctor Muñoz',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'ESP'
ON CONFLICT DO NOTHING;
