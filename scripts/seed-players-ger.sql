INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Oliver Baumann',        'GK',  1),
  ('Manuel Neuer',          'GK',  2),
  ('Alexander Nübel',       'GK',  3),
  ('Waldemar Anton',        'DEF', 4),
  ('Nathaniel Brown',       'DEF', 5),
  ('David Raum',            'DEF', 6),
  ('Antonio Rüdiger',       'DEF', 7),
  ('Nico Schlotterbeck',    'DEF', 8),
  ('Jonathan Tah',          'DEF', 9),
  ('Malick Thiaw',          'DEF', 10),
  ('Pascal Gross',          'MID', 11),
  ('Joshua Kimmich',        'MID', 12),
  ('Aleksandar Pavlovic',   'MID', 13),
  ('Felix Nmecha',          'MID', 14),
  ('Angelo Stiller',        'MID', 15),
  ('Nadiem Amiri',          'MID', 16),
  ('Leon Goretzka',         'MID', 17),
  ('Jamie Leweling',        'MID', 18),
  ('Maximilian Beier',      'FWD', 19),
  ('Kai Havertz',           'FWD', 20),
  ('Lennart Karl',          'FWD', 21),
  ('Jamal Musiala',         'FWD', 22),
  ('Leroy Sané',            'FWD', 23),
  ('Deniz Undav',           'FWD', 24),
  ('Florian Wirtz',         'FWD', 25),
  ('Nick Woltemade',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'GER'
ON CONFLICT DO NOTHING;
