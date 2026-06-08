INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Fernando Muslera',      'GK',  1),
  ('Sergio Rochet',         'GK',  2),
  ('Santiago Mele',         'GK',  3),
  ('Ronald Araújo',         'DEF', 4),
  ('José María Giménez',    'DEF', 5),
  ('Santiago Bueno',        'DEF', 6),
  ('Sebastián Cáceres',     'DEF', 7),
  ('Mathías Olivera',       'DEF', 8),
  ('Guillermo Varela',      'DEF', 9),
  ('Matías Viña',           'DEF', 10),
  ('Joaquín Piquerez',      'DEF', 11),
  ('Juan Manuel Sanabria',  'DEF', 12),
  ('Federico Valverde',     'MID', 13),
  ('Rodrigo Bentancur',     'MID', 14),
  ('Manuel Ugarte',         'MID', 15),
  ('Emiliano Martínez',     'MID', 16),
  ('Rodrigo Zalazar',       'MID', 17),
  ('Giorgian De Arrascaeta','MID', 18),
  ('Nicolás De La Cruz',    'MID', 19),
  ('Agustín Canobbio',      'MID', 20),
  ('Maximiliano Araújo',    'MID', 21),
  ('Brian Rodríguez',       'MID', 22),
  ('Facundo Pellistri',     'MID', 23),
  ('Darwin Núñez',          'FWD', 24),
  ('Federico Viñas',        'FWD', 25),
  ('Rodrigo Aguirre',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'URU'
ON CONFLICT DO NOTHING;
