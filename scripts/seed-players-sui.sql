INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Gregor Kobel',        'GK',  1),
  ('Yvon Mvogo',          'GK',  2),
  ('Marvin Keller',       'GK',  3),
  ('Manuel Akanji',       'DEF', 4),
  ('Nico Elvedi',         'DEF', 5),
  ('Ricardo Rodríguez',   'DEF', 6),
  ('Silvan Widmer',       'DEF', 7),
  ('Miro Muheim',         'DEF', 8),
  ('Aurèle Amenda',       'DEF', 9),
  ('Eray Cömert',         'DEF', 10),
  ('Luca Jaquez',         'DEF', 11),
  ('Granit Xhaka',        'MID', 12),
  ('Johan Manzambi',      'MID', 13),
  ('Remo Freuler',        'MID', 14),
  ('Denis Zakaria',       'MID', 15),
  ('Ardon Jashari',       'MID', 16),
  ('Djibril Sow',         'MID', 17),
  ('Christian Fassnacht', 'MID', 18),
  ('Michel Aebischer',    'MID', 19),
  ('Fabian Rieder',       'MID', 20),
  ('Rubén Vargas',        'MID', 21),
  ('Breel Embolo',        'FWD', 22),
  ('Noah Okafor',         'FWD', 23),
  ('Dan Ndoye',           'FWD', 24),
  ('Zeki Amdouni',        'FWD', 25),
  ('Cedric Itten',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'SUI'
ON CONFLICT DO NOTHING;
