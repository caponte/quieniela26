DELETE FROM public.players WHERE team_id = (SELECT id FROM public.teams WHERE fifa_code = 'EGY');

INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Mohamed El Shenawy',    'GK',  1),
  ('Mahdy Soliman',         'GK',  2),
  ('Mostafa Shobeir',       'GK',  3),
  ('Mohamed Alaa',          'GK',  4),
  ('Yasser Ibrahim',        'DEF', 5),
  ('Mohamed Hany',          'DEF', 6),
  ('Hossam Abdelmaguid',    'DEF', 7),
  ('Ramy Rabia',            'DEF', 8),
  ('Mohamed Abdelmoneim',   'DEF', 9),
  ('Ahmed Fatouh',          'DEF', 10),
  ('Karim Hafez',           'DEF', 11),
  ('Tarek Alaa',            'DEF', 12),
  ('Emam Ashour',           'MID', 13),
  ('Mostafa Zico',          'MID', 14),
  ('Hamdy Fathy',           'MID', 15),
  ('Mohanad Lashin',        'MID', 16),
  ('Nabil Donga',           'MID', 17),
  ('Marawan Attia',         'MID', 18),
  ('Mahmoud Saber',         'MID', 19),
  ('Mahmoud Trezeguet',     'FWD', 20),
  ('Hamza Abdelkarim',      'FWD', 21),
  ('Mohamed Salah',         'FWD', 22),
  ('Haissem Hassan',        'FWD', 23),
  ('Ibrahim Adel',          'FWD', 24),
  ('Omar Marmoush',         'FWD', 25),
  ('Ahmed Zizo',            'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'EGY';
