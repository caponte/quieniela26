INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Álvaro Montero',         'GK',  1),
  ('David Ospina',           'GK',  2),
  ('Camilo Vargas',          'GK',  3),
  ('Santiago Arias',         'DEF', 4),
  ('Willer Ditta',           'DEF', 5),
  ('Jhon Lucumí',            'DEF', 6),
  ('Deiver Machado',         'DEF', 7),
  ('Yerry Mina',             'DEF', 8),
  ('Johan Mojica',           'DEF', 9),
  ('Daniel Muñoz',           'DEF', 10),
  ('Davinson Sánchez',       'DEF', 11),
  ('Jhon Arias',             'MID', 12),
  ('Jaminton Campaz',        'MID', 13),
  ('Jorge Carrascal',        'MID', 14),
  ('Kevin Castaño',          'MID', 15),
  ('Jefferson Lerma',        'MID', 16),
  ('Juan Camilo Portilla',   'MID', 17),
  ('Gustavo Puerta',         'MID', 18),
  ('Juan Fernando Quintero', 'MID', 19),
  ('James Rodríguez',        'MID', 20),
  ('Richard Ríos',           'MID', 21),
  ('Jhon Córdoba',           'FWD', 22),
  ('Carlos Andrés Gómez',    'FWD', 23),
  ('Juan Camilo Hernández',  'FWD', 24),
  ('Luis Suárez',            'FWD', 25),
  ('Luis Díaz',              'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'COL'
ON CONFLICT DO NOTHING;
