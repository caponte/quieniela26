INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Hernán Galíndez',      'GK',  1),
  ('Moisés Ramírez',       'GK',  2),
  ('Gonzalo Valle',        'GK',  3),
  ('Willian Pacho',        'DEF', 4),
  ('Piero Hincapié',       'DEF', 5),
  ('Joel Ordóñez',         'DEF', 6),
  ('Félix Torres',         'DEF', 7),
  ('Pervis Estupiñán',     'DEF', 8),
  ('Ángelo Preciado',      'DEF', 9),
  ('Jackson Porozo',       'DEF', 10),
  ('Moisés Caicedo',       'MID', 11),
  ('Jordy Alcívar',        'MID', 12),
  ('Denil Castillo',       'MID', 13),
  ('Alan Franco',          'MID', 14),
  ('Pedro Vite',           'MID', 15),
  ('Kendry Páez',          'MID', 16),
  ('Yaimar Medina',        'MID', 17),
  ('Kevin Rodríguez',      'FWD', 18),
  ('Anthony Valencia',     'FWD', 19),
  ('Enner Valencia',       'FWD', 20),
  ('Jordy Caicedo',        'FWD', 21),
  ('Jeremy Arévalo',       'FWD', 22),
  ('Gonzalo Plata',        'FWD', 23),
  ('Alan Minda',           'FWD', 24),
  ('John Yeboah',          'FWD', 25),
  ('Nilson Angulo',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'ECU'
ON CONFLICT DO NOTHING;
