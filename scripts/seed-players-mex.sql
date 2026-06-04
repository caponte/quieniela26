INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Carlos Acevedo',      'GK',  1),
  ('Guillermo Ochoa',     'GK',  2),
  ('Raúl Rangel',         'GK',  3),
  ('César Montes',        'DEF', 4),
  ('Edson Álvarez',       'DEF', 5),
  ('Israel Reyes',        'DEF', 6),
  ('Jesús Gallardo',      'DEF', 7),
  ('Johan Vásquez',       'DEF', 8),
  ('Jorge Sánchez',       'DEF', 9),
  ('Mateo Chávez',        'DEF', 10),
  ('Álvaro Fidalgo',      'MID', 11),
  ('Brian Gutiérrez',     'MID', 12),
  ('Erik Lira',           'MID', 13),
  ('Gilberto Mora',       'MID', 14),
  ('Luis Chávez',         'MID', 15),
  ('Luis Romo',           'MID', 16),
  ('Obed Vargas',         'MID', 17),
  ('Orbelín Pineda',      'MID', 18),
  ('Alexis Vega',         'FWD', 19),
  ('Armando González',    'FWD', 20),
  ('César Huerta',        'FWD', 21),
  ('Guillermo Martínez',  'FWD', 22),
  ('Julián Quiñones',     'FWD', 23),
  ('Raúl Jiménez',        'FWD', 24),
  ('Roberto Alvarado',    'FWD', 25),
  ('Santiago Giménez',    'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'MEX'
ON CONFLICT DO NOTHING;
