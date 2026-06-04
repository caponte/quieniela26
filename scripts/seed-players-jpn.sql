INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Zion Suzuki',        'GK',  1),
  ('Keisuke Osako',      'GK',  2),
  ('Tomoki Hayakawa',    'GK',  3),
  ('Yūto Nagatomo',      'DEF', 4),
  ('Shogo Taniguchi',    'DEF', 5),
  ('Ko Itakura',         'DEF', 6),
  ('Tsuyoshi Watanabe',  'DEF', 7),
  ('Takehiro Tomiyasu',  'DEF', 8),
  ('Hiroki Ito',         'DEF', 9),
  ('Ayumu Seko',         'DEF', 10),
  ('Yukinari Sugawara',  'DEF', 11),
  ('Junnosuke Suzuki',   'MID', 12),
  ('Wataru Endo',        'MID', 13),
  ('Junya Ito',          'MID', 14),
  ('Daichi Kamada',      'MID', 15),
  ('Ritsu Doan',         'MID', 16),
  ('Ao Tanaka',          'MID', 17),
  ('Keito Nakamura',     'MID', 18),
  ('Kaishu Sano',        'MID', 19),
  ('Takefusa Kubo',      'MID', 20),
  ('Yuito Suzuki',       'MID', 21),
  ('Koki Ogawa',         'FWD', 22),
  ('Daizen Maeda',       'FWD', 23),
  ('Ayase Ueda',         'FWD', 24),
  ('Kento Shiogai',      'FWD', 25),
  ('Keisuke Goto',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'JPN'
ON CONFLICT DO NOTHING;
