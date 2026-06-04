INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Thibaut Courtois',       'GK',  1),
  ('Senne Lammens',          'GK',  2),
  ('Mike Penders',           'GK',  3),
  ('Timothy Castagne',       'DEF', 4),
  ('Zeno Debast',            'DEF', 5),
  ('Maxim De Cuyper',        'DEF', 6),
  ('Koni De Winter',         'DEF', 7),
  ('Brandon Mechele',        'DEF', 8),
  ('Thomas Meunier',         'DEF', 9),
  ('Nathan Ngoy',            'DEF', 10),
  ('Joaquin Seys',           'DEF', 11),
  ('Arthur Theate',          'DEF', 12),
  ('Kevin De Bruyne',        'MID', 13),
  ('Amadou Onana',           'MID', 14),
  ('Nicolas Raskin',         'MID', 15),
  ('Youri Tielemans',        'MID', 16),
  ('Hans Vanaken',           'MID', 17),
  ('Axel Witsel',            'MID', 18),
  ('Charles De Ketelaere',   'FWD', 19),
  ('Jérémy Doku',            'FWD', 20),
  ('Matias Fernandez-Pardo', 'FWD', 21),
  ('Romelu Lukaku',          'FWD', 22),
  ('Dodi Lukebakio',         'FWD', 23),
  ('Diego Moreira',          'FWD', 24),
  ('Alexis Saelemaekers',    'FWD', 25),
  ('Leandro Trossard',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'BEL'
ON CONFLICT DO NOTHING;
