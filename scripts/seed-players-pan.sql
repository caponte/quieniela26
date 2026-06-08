INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Orlando Mosquera',      'GK',  1),
  ('Luis Mejía',            'GK',  2),
  ('César Samudio',         'GK',  3),
  ('César Blackman',        'DEF', 4),
  ('Jorge Gutiérrez',       'DEF', 5),
  ('Amir Murillo',          'DEF', 6),
  ('Fidel Escobar',         'DEF', 7),
  ('Andrés Andrade',        'DEF', 8),
  ('Edgardo Fariña',        'DEF', 9),
  ('José Córdoba',          'DEF', 10),
  ('Éric Davis',            'DEF', 11),
  ('Jiovany Ramos',         'DEF', 12),
  ('Roderick Miller',       'DEF', 13),
  ('Aníbal Godoy',          'MID', 14),
  ('Adalberto Carrasquilla','MID', 15),
  ('Carlos Harvey',         'MID', 16),
  ('Cristian Martínez',     'MID', 17),
  ('José Luis Rodríguez',   'MID', 18),
  ('César Yanis',           'MID', 19),
  ('Yoel Bárcenas',         'MID', 20),
  ('Alberto Quintero',      'MID', 21),
  ('Azarias Londoño',       'MID', 22),
  ('Ismael Díaz',           'FWD', 23),
  ('Cecilio Waterman',      'FWD', 24),
  ('José Fajardo',          'FWD', 25),
  ('Tomás Rodríguez',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'PAN'
ON CONFLICT DO NOTHING;
