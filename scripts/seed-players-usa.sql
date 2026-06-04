INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Matt Freese',          'GK',  1),
  ('Matt Turner',          'GK',  2),
  ('Chris Brady',          'GK',  3),
  ('Max Arfsten',          'DEF', 4),
  ('Sergiño Dest',         'DEF', 5),
  ('Alex Freeman',         'DEF', 6),
  ('Mark McKenzie',        'DEF', 7),
  ('Tim Ream',             'DEF', 8),
  ('Chris Richards',       'DEF', 9),
  ('Antonee Robinson',     'DEF', 10),
  ('Miles Robinson',       'DEF', 11),
  ('Joe Scally',           'DEF', 12),
  ('Auston Trusty',        'DEF', 13),
  ('Tyler Adams',          'MID', 14),
  ('Sebastian Berhalter',  'MID', 15),
  ('Weston McKennie',      'MID', 16),
  ('Cristian Roldan',      'MID', 17),
  ('Brenden Aaronson',     'MID', 18),
  ('Christian Pulisic',    'MID', 19),
  ('Gio Reyna',            'MID', 20),
  ('Malik Tillman',        'MID', 21),
  ('Tim Weah',             'MID', 22),
  ('Alejandro Zendejas',   'MID', 23),
  ('Folarin Balogun',      'FWD', 24),
  ('Ricardo Pepi',         'FWD', 25),
  ('Haji Wright',          'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'USA'
ON CONFLICT DO NOTHING;
