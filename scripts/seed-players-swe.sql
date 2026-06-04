INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Viktor Johansson',          'GK',  1),
  ('Kristoffer Nordfeldt',      'GK',  2),
  ('Jacob Widell Zetterstrom',  'GK',  3),
  ('Hjalmar Ekdal',             'DEF', 4),
  ('Gabriel Gudmundsson',       'DEF', 5),
  ('Isak Hien',                 'DEF', 6),
  ('Emil Holm',                 'DEF', 7),
  ('Gustaf Lagerbielke',        'DEF', 8),
  ('Victor Lindelöf',           'DEF', 9),
  ('Erik Smith',                'DEF', 10),
  ('Carl Starfelt',             'DEF', 11),
  ('Elliot Stroud',             'DEF', 12),
  ('Daniel Svensson',           'DEF', 13),
  ('Taha Ali',                  'MID', 14),
  ('Yasin Ayari',               'MID', 15),
  ('Lucas Bergvall',            'MID', 16),
  ('Jesper Karlström',          'MID', 17),
  ('Ken Sema',                  'MID', 18),
  ('Mattias Svanberg',          'MID', 19),
  ('Besfort Zeneli',            'MID', 20),
  ('Alexander Bernhardsson',    'FWD', 21),
  ('Anthony Elanga',            'FWD', 22),
  ('Viktor Gyökeres',           'FWD', 23),
  ('Alexander Isak',            'FWD', 24),
  ('Gustaf Nilsson',            'FWD', 25),
  ('Benjamin Nygren',           'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'SWE'
ON CONFLICT DO NOTHING;
