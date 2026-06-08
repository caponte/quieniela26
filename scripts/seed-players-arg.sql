INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Emiliano Martínez',    'GK',  1),
  ('Gerónimo Rulli',       'GK',  2),
  ('Juan Musso',           'GK',  3),
  ('Gonzalo Montiel',      'DEF', 4),
  ('Nahuel Molina',        'DEF', 5),
  ('Lisandro Martínez',    'DEF', 6),
  ('Nicolás Otamendi',     'DEF', 7),
  ('Leonardo Balerdi',     'DEF', 8),
  ('Cristian Romero',      'DEF', 9),
  ('Facundo Medina',       'DEF', 10),
  ('Nicolás Tagliafico',   'DEF', 11),
  ('Leandro Paredes',      'MID', 12),
  ('Rodrigo De Paul',      'MID', 13),
  ('Exequiel Palacios',    'MID', 14),
  ('Enzo Fernández',       'MID', 15),
  ('Alexis Mac Allister',  'MID', 16),
  ('Giovani Lo Celso',     'MID', 17),
  ('Valentín Barco',       'MID', 18),
  ('Lionel Messi',         'FWD', 19),
  ('Nico Paz',             'FWD', 20),
  ('Thiago Almada',        'FWD', 21),
  ('Nicolás González',     'FWD', 22),
  ('Giuliano Simeone',     'FWD', 23),
  ('Lautaro Martínez',     'FWD', 24),
  ('Jose Manuel López',    'FWD', 25),
  ('Julián Álvarez',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'ARG'
ON CONFLICT DO NOTHING;
