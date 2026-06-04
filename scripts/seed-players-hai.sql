INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Johny Placide',           'GK',  1),
  ('Alexandre Pierre',        'GK',  2),
  ('Josue Duverger',          'GK',  3),
  ('Carlens Arcus',           'DEF', 4),
  ('Wilguens Paugain',        'DEF', 5),
  ('Duke Lacroix',            'DEF', 6),
  ('Martin Expérience',       'DEF', 7),
  ('Jean-Kévin Duverne',      'DEF', 8),
  ('Ricardo Adé',             'DEF', 9),
  ('Hannes Delcroix',         'DEF', 10),
  ('Keeto Thermoncy',         'DEF', 11),
  ('Carl Fred Sainté',        'MID', 12),
  ('Leverton Pierre',         'MID', 13),
  ('Danley Jean Jacques',     'MID', 14),
  ('Jean-Ricner Bellegarde',  'MID', 15),
  ('Woodensky Pierre',        'MID', 16),
  ('Dominique Simon',         'MID', 17),
  ('Don Deedson Louicius',    'FWD', 18),
  ('Josué Casimir',           'FWD', 19),
  ('Derrick Etienne',         'FWD', 20),
  ('Ruben Providence',        'FWD', 21),
  ('Duckens Nazon',           'FWD', 22),
  ('Frantzdy Pierrot',        'FWD', 23),
  ('Wilson Isidor',           'FWD', 24),
  ('Yassin Fortuné',          'FWD', 25),
  ('Lenny Joseph',            'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'HAI'
ON CONFLICT DO NOTHING;
