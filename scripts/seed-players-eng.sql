INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Jordan Pickford',    'GK',  1),
  ('Dean Henderson',     'GK',  2),
  ('James Trafford',     'GK',  3),
  ('Reece James',        'DEF', 4),
  ('Ezri Konsa',         'DEF', 5),
  ('Jarell Quansah',     'DEF', 6),
  ('John Stones',        'DEF', 7),
  ('Marc Guéhi',         'DEF', 8),
  ('Dan Burn',           'DEF', 9),
  ('Nico O''Reilly',     'DEF', 10),
  ('Djed Spence',        'DEF', 11),
  ('Tino Livramento',    'DEF', 12),
  ('Declan Rice',        'MID', 13),
  ('Elliot Anderson',    'MID', 14),
  ('Kobbie Mainoo',      'MID', 15),
  ('Jordan Henderson',   'MID', 16),
  ('Morgan Rogers',      'MID', 17),
  ('Jude Bellingham',    'MID', 18),
  ('Eberechi Eze',       'MID', 19),
  ('Harry Kane',         'FWD', 20),
  ('Ivan Toney',         'FWD', 21),
  ('Ollie Watkins',      'FWD', 22),
  ('Bukayo Saka',        'FWD', 23),
  ('Marcus Rashford',    'FWD', 24),
  ('Anthony Gordon',     'FWD', 25),
  ('Noni Madueke',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'ENG'
ON CONFLICT DO NOTHING;
