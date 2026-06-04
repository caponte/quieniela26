INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Jo Hyeon-Woo',      'GK',  1),
  ('Kim Seung-Gyu',     'GK',  2),
  ('Song Bum-Keun',     'GK',  3),
  ('Kim Min-Jae',       'DEF', 4),
  ('Jo Yu-Min',         'DEF', 5),
  ('Lee Han-Beom',      'DEF', 6),
  ('Kim Tae-Hyeon',     'DEF', 7),
  ('Park Jin-Seop',     'DEF', 8),
  ('Lee Gi-Hyeok',      'DEF', 9),
  ('Lee Tae-Seok',      'DEF', 10),
  ('Seol Young-Woo',    'DEF', 11),
  ('Jens Castrop',      'DEF', 12),
  ('Kim Moon-Hwan',     'DEF', 13),
  ('Yang Hyun-Jun',     'MID', 14),
  ('Paik Seung-Ho',     'MID', 15),
  ('Hwang In-Beom',     'MID', 16),
  ('Kim Jin-Kyu',       'MID', 17),
  ('Bae Jun-Ho',        'MID', 18),
  ('Eom Ji-Sung',       'MID', 19),
  ('Hwang Hee-Chan',    'MID', 20),
  ('Lee Dong-Gyeong',   'MID', 21),
  ('Lee Jae-Sung',      'MID', 22),
  ('Lee Kang-In',       'MID', 23),
  ('Oh Hyeon-Gyu',      'FWD', 24),
  ('Son Heung-Min',     'FWD', 25),
  ('Cho Gue-Sung',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'KOR'
ON CONFLICT DO NOTHING;
