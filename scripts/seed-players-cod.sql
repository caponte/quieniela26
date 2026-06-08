INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Lionel Mpasi',          'GK',  1),
  ('Timothy Fayulu',        'GK',  2),
  ('Matthieu Epolo',        'GK',  3),
  ('Chancel Mbemba',        'DEF', 4),
  ('Axel Tuanzebe',         'DEF', 5),
  ('Arthur Masuaku',        'DEF', 6),
  ('Gedeon Kalulu',         'DEF', 7),
  ('Joris Kayembe',         'DEF', 8),
  ('Aaron Wan-Bissaka',     'DEF', 9),
  ('Aaron Tshibola',        'DEF', 10),
  ('Steve Kapuadi',         'DEF', 11),
  ('Dylan Batubinsika',     'DEF', 12),
  ('Noah Sadiki',           'MID', 13),
  ('Charles Pickel',        'MID', 14),
  ('Edo Kayembe',           'MID', 15),
  ('Samuel Moutoussamy',    'MID', 16),
  ('Ngal''ayel Mukau',      'MID', 17),
  ('Nathanaël Mbuku',       'MID', 18),
  ('Meschak Elia',          'MID', 19),
  ('Brian Cipenga',         'MID', 20),
  ('Gaël Kakuta',           'MID', 21),
  ('Théo Bongonda',         'MID', 22),
  ('Simon Banza',           'FWD', 23),
  ('Yoane Wissa',           'FWD', 24),
  ('Fiston Mayele',         'FWD', 25),
  ('Cédric Bakambu',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'COD'
ON CONFLICT DO NOTHING;
