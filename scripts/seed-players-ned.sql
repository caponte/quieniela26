INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Mark Flekken',           'GK',  1),
  ('Robin Roefs',            'GK',  2),
  ('Bart Verbruggen',        'GK',  3),
  ('Nathan Aké',             'DEF', 4),
  ('Denzel Dumfries',        'DEF', 5),
  ('Jorrel Hato',            'DEF', 6),
  ('Jurriën Timber',         'DEF', 7),
  ('Jan Paul van Hecke',     'DEF', 8),
  ('Micky van de Ven',       'DEF', 9),
  ('Virgil van Dijk',        'DEF', 10),
  ('Frenkie de Jong',        'MID', 11),
  ('Marten de Roon',         'MID', 12),
  ('Ryan Gravenberch',       'MID', 13),
  ('Teun Koopmeiners',       'MID', 14),
  ('Tijjani Reijnders',      'MID', 15),
  ('Guus Til',               'MID', 16),
  ('Quinten Timber',         'MID', 17),
  ('Mats Wieffer',           'MID', 18),
  ('Brian Brobbey',          'FWD', 19),
  ('Memphis Depay',          'FWD', 20),
  ('Cody Gakpo',             'FWD', 21),
  ('Justin Kluivert',        'FWD', 22),
  ('Noa Lang',               'FWD', 23),
  ('Donyell Malen',          'FWD', 24),
  ('Crysencio Summerville',  'FWD', 25),
  ('Wout Weghorst',          'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'NED'
ON CONFLICT DO NOTHING;
