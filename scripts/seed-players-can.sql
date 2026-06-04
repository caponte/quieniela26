INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Maxime Crépeau',      'GK',  1),
  ('Owen Goodman',        'GK',  2),
  ('Dayne St. Clair',     'GK',  3),
  ('Moïse Bombito',       'DEF', 4),
  ('Derek Cornelius',     'DEF', 5),
  ('Alphonso Davies',     'DEF', 6),
  ('Luc de Fougerolles',  'DEF', 7),
  ('Alistair Johnston',   'DEF', 8),
  ('Alfie Jones',         'DEF', 9),
  ('Richie Laryea',       'DEF', 10),
  ('Niko Sigur',          'DEF', 11),
  ('Joel Waterman',       'DEF', 12),
  ('Ali Ahmed',           'MID', 13),
  ('Tajon Buchanan',      'MID', 14),
  ('Mathieu Choinière',   'MID', 15),
  ('Stephen Eustáquio',   'MID', 16),
  ('Marcelo Flores',      'MID', 17),
  ('Ismaël Koné',         'MID', 18),
  ('Liam Millar',         'MID', 19),
  ('Jonathan Osorio',     'MID', 20),
  ('Nathan Saliba',       'MID', 21),
  ('Jacob Shaffelburg',   'MID', 22),
  ('Jonathan David',      'FWD', 23),
  ('Promise David',       'FWD', 24),
  ('Cyle Larin',          'FWD', 25),
  ('Tani Oluwaseyi',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CAN'
ON CONFLICT DO NOTHING;
