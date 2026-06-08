INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Ørjan Nyland',              'GK',  1),
  ('Egil Selvik',               'GK',  2),
  ('Sander Tangvik',            'GK',  3),
  ('Julian Ryerson',            'DEF', 4),
  ('Kristoffer Ajer',           'DEF', 5),
  ('Leo Østigard',              'DEF', 6),
  ('David Møller Wolfe',        'DEF', 7),
  ('Marcus Pedersen',           'DEF', 8),
  ('Torbjørn Heggem',           'DEF', 9),
  ('Fredrik André Bjørkan',     'DEF', 10),
  ('Henrik Falchener',          'DEF', 11),
  ('Sondre Langås',             'DEF', 12),
  ('Martin Ødegaard',           'MID', 13),
  ('Sander Berge',              'MID', 14),
  ('Patrick Berg',              'MID', 15),
  ('Kristian Thorstvedt',       'MID', 16),
  ('Morten Thorsby',            'MID', 17),
  ('Thelo Aasgaard',            'MID', 18),
  ('Andreas Schjelderup',       'MID', 19),
  ('Jens Petter Hauge',         'MID', 20),
  ('Fredrik Aursnes',           'MID', 21),
  ('Oscar Bobb',                'MID', 22),
  ('Antonio Nusa',              'MID', 23),
  ('Erling Haaland',            'FWD', 24),
  ('Alexander Sørloth',         'FWD', 25),
  ('Jørgen Strand Larsen',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'NOR'
ON CONFLICT DO NOTHING;
