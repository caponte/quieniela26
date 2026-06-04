INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Yahia Fofana',          'GK',  1),
  ('Mohamed Koné',          'GK',  2),
  ('Alban Lafont',          'GK',  3),
  ('Emmanuel Agbadou',      'DEF', 4),
  ('Clément Akpa',          'DEF', 5),
  ('Ousmane Diomande',      'DEF', 6),
  ('Guela Doué',            'DEF', 7),
  ('Ghislain Konan',        'DEF', 8),
  ('Odilon Kossounou',      'DEF', 9),
  ('Evan Ndicka',           'DEF', 10),
  ('Wilfried Singo',        'DEF', 11),
  ('Seko Fofana',           'MID', 12),
  ('Parfait Guiagon',       'MID', 13),
  ('Franck Kessié',         'MID', 14),
  ('Christ Inao Oulaï',     'MID', 15),
  ('Ibrahim Sangaré',       'MID', 16),
  ('Jean Michaël Seri',     'MID', 17),
  ('Simon Adingra',         'FWD', 18),
  ('Ange-Yoan Bonny',       'FWD', 19),
  ('Amad Diallo',           'FWD', 20),
  ('Oumar Diakité',         'FWD', 21),
  ('Yan Diomande',          'FWD', 22),
  ('Evann Guessand',        'FWD', 23),
  ('Nicolas Pépé',          'FWD', 24),
  ('Bazoumana Touré',       'FWD', 25),
  ('Elye Wahi',             'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CIV'
ON CONFLICT DO NOTHING;
