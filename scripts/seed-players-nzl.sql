INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Max Crocombe',       'GK',  1),
  ('Alex Paulsen',       'GK',  2),
  ('Michael Woud',       'GK',  3),
  ('Tim Payne',          'DEF', 4),
  ('Francis De Vries',   'DEF', 5),
  ('Tyler Bindon',       'DEF', 6),
  ('Michael Boxall',     'DEF', 7),
  ('Liberato Cacace',    'DEF', 8),
  ('Nando Pijnaker',     'DEF', 9),
  ('Finn Surman',        'DEF', 10),
  ('Callan Elliot',      'DEF', 11),
  ('Tommy Smith',        'DEF', 12),
  ('Joe Bell',           'MID', 13),
  ('Matt Garbett',       'MID', 14),
  ('Marko Stamenic',     'MID', 15),
  ('Sarpreet Singh',     'MID', 16),
  ('Alex Rufer',         'MID', 17),
  ('Ryan Thomas',        'MID', 18),
  ('Chris Wood',         'FWD', 19),
  ('Eli Just',           'FWD', 20),
  ('Kosta Barbarouses',  'FWD', 21),
  ('Ben Waine',          'FWD', 22),
  ('Ben Old',            'FWD', 23),
  ('Callum McCowatt',    'FWD', 24),
  ('Jesse Randall',      'FWD', 25),
  ('Lachlan Bayliss',    'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'NZL'
ON CONFLICT DO NOTHING;
