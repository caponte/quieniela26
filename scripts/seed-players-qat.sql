INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Salah Zakaria',        'GK',  1),
  ('Meshaal Barsham',      'GK',  2),
  ('Mahmoud Abunada',      'GK',  3),
  ('Pedro Miguel',         'DEF', 4),
  ('Sultan Al Brake',      'DEF', 5),
  ('Al-Hashmi Al-Hussain', 'DEF', 6),
  ('Ayoub Al-Alawi',       'DEF', 7),
  ('Issa Laye',            'DEF', 8),
  ('Lucas Mendes',         'DEF', 9),
  ('Mohammed Waad',        'DEF', 10),
  ('Niall Mason',          'DEF', 11),
  ('Ahmed Fathi',          'MID', 12),
  ('Jassim Gaber',         'MID', 13),
  ('Assim Madibo',         'MID', 14),
  ('Abdulaziz Hatem',      'MID', 15),
  ('Karim Boudiaf',        'MID', 16),
  ('Mohammed Mannai',      'MID', 17),
  ('Almoez Ali',           'FWD', 18),
  ('Akram Afif',           'FWD', 19),
  ('Tahsin Mohammed',      'FWD', 20),
  ('Edmílson Junior',      'FWD', 21),
  ('Ahmed Alaa',           'FWD', 22),
  ('Hassan Al-Haydos',     'FWD', 23),
  ('Mubarak Shannan',      'FWD', 24),
  ('Mohammed Muntari',     'FWD', 25),
  ('Yusuf Abdurisag',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'QAT'
ON CONFLICT DO NOTHING;
