INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Alexander Schlager',     'GK',  1),
  ('Florian Wiegele',        'GK',  2),
  ('Patrick Pentz',          'GK',  3),
  ('David Affengruber',      'DEF', 4),
  ('Kevin Danso',            'DEF', 5),
  ('Stefan Posch',           'DEF', 6),
  ('David Alaba',            'DEF', 7),
  ('Philipp Lienhart',       'DEF', 8),
  ('Philipp Mwene',          'DEF', 9),
  ('Alexander Prass',        'DEF', 10),
  ('Marco Friedl',           'DEF', 11),
  ('Michael Svoboda',        'DEF', 12),
  ('Xaver Schlager',         'MID', 13),
  ('Nicolas Seiwald',        'MID', 14),
  ('Marcel Sabitzer',        'MID', 15),
  ('Florian Grillitsch',     'MID', 16),
  ('Carney Chukwuemeka',     'MID', 17),
  ('Romano Schmid',          'MID', 18),
  ('Christoph Baumgartner',  'MID', 19),
  ('Konrad Laimer',          'MID', 20),
  ('Patrick Wimmer',         'MID', 21),
  ('Paul Wanner',            'MID', 22),
  ('Alessandro Schopf',      'MID', 23),
  ('Marko Arnautovic',       'FWD', 24),
  ('Michael Gregoritsch',    'FWD', 25),
  ('Sasa Kalajdzic',         'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'AUT'
ON CONFLICT DO NOTHING;
