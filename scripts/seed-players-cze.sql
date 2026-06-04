INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Lukáš Horníček',    'GK',  1),
  ('Matěj Kovář',       'GK',  2),
  ('Jindřich Staněk',   'GK',  3),
  ('Vladimír Coufal',   'DEF', 4),
  ('David Douděra',     'DEF', 5),
  ('Tomáš Holeš',       'DEF', 6),
  ('Robin Hranáč',      'DEF', 7),
  ('Štěpán Chaloupek',  'DEF', 8),
  ('David Jurásek',     'DEF', 9),
  ('Ladislav Krejčí',   'DEF', 10),
  ('Jaroslav Zelený',   'DEF', 11),
  ('David Zima',        'DEF', 12),
  ('Lukáš Červ',        'MID', 13),
  ('Vladimír Darida',   'MID', 14),
  ('Lukáš Provod',      'MID', 15),
  ('Michal Sadílek',    'MID', 16),
  ('Hugo Sochůrek',     'MID', 17),
  ('Alexandr Sojka',    'MID', 18),
  ('Tomáš Souček',      'MID', 19),
  ('Pavel Šulc',        'MID', 20),
  ('Denis Višinský',    'MID', 21),
  ('Tomáš Chorý',       'FWD', 22),
  ('Adam Hložek',       'FWD', 23),
  ('Mojmír Chytil',     'FWD', 24),
  ('Jan Kuchta',        'FWD', 25),
  ('Patrik Schick',     'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CZE'
ON CONFLICT DO NOTHING;
