INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Craig Gordon',       'GK',  1),
  ('Angus Gunn',         'GK',  2),
  ('Liam Kelly',         'GK',  3),
  ('Grant Hanley',       'DEF', 4),
  ('Jack Hendry',        'DEF', 5),
  ('Aaron Hickey',       'DEF', 6),
  ('Dom Hyam',           'DEF', 7),
  ('Scott McKenna',      'DEF', 8),
  ('Nathan Patterson',   'DEF', 9),
  ('Anthony Ralston',    'DEF', 10),
  ('Andy Robertson',     'DEF', 11),
  ('John Souttar',       'DEF', 12),
  ('Kieran Tierney',     'DEF', 13),
  ('Ryan Christie',      'MID', 14),
  ('Finlay Curtis',      'MID', 15),
  ('Lewis Ferguson',     'MID', 16),
  ('Ben Doak',           'MID', 17),
  ('Billy Gilmour',      'MID', 18),
  ('John McGinn',        'MID', 19),
  ('Kenny McLean',       'MID', 20),
  ('Scott McTominay',    'MID', 21),
  ('Ché Adams',          'FWD', 22),
  ('Lyndon Dykes',       'FWD', 23),
  ('George Hirst',       'FWD', 24),
  ('Lawrence Shankland', 'FWD', 25),
  ('Ross Stewart',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'SCO'
ON CONFLICT DO NOTHING;
