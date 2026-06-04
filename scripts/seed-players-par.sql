INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Roberto Fernández',          'GK',  1),
  ('Orlando Gill',               'GK',  2),
  ('Gastón Olveira',             'GK',  3),
  ('Gustavo Gómez',              'DEF', 4),
  ('Juan Caceres',               'DEF', 5),
  ('Gustavo Velázquez',          'DEF', 6),
  ('Júnior Alonso',              'DEF', 7),
  ('Jose Canale',                'DEF', 8),
  ('Omar Alderete',              'DEF', 9),
  ('Alexandro Maidana',          'DEF', 10),
  ('Fabián Balbuena',            'DEF', 11),
  ('Diego Gómez',                'MID', 12),
  ('Mauricio Magalhães',         'MID', 13),
  ('Damián Bobadilla',           'MID', 14),
  ('Braian Ojeda',               'MID', 15),
  ('Andrés Cubas',               'MID', 16),
  ('Matías Galarza',             'MID', 17),
  ('Kaku Romero Gamarra',        'MID', 18),
  ('Gustavo Caballero',          'FWD', 19),
  ('Ramón Sosa',                 'FWD', 20),
  ('Alex Arce',                  'FWD', 21),
  ('Isidro Pitta',               'FWD', 22),
  ('Gabriel Avalos',             'FWD', 23),
  ('Miguel Almirón',             'FWD', 24),
  ('Julio Enciso',               'FWD', 25),
  ('Antonio Sanabria',           'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'PAR'
ON CONFLICT DO NOTHING;
