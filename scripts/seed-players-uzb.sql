INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Utkir Yusupov',          'GK',  1),
  ('Abduvakhid Nematov',     'GK',  2),
  ('Botirali Ergashev',      'GK',  3),
  ('Khojiakbar Alijonov',    'DEF', 4),
  ('Farrukh Sayfiev',        'DEF', 5),
  ('Rustam Ashurmatov',      'DEF', 6),
  ('Sherzod Nasrullaev',     'DEF', 7),
  ('Umar Eshmurodov',        'DEF', 8),
  ('Abdulla Abdullaev',      'DEF', 9),
  ('Behruzjon Karimov',      'DEF', 10),
  ('Avazbek Ulmasaliyev',    'DEF', 11),
  ('Jakhongir Urozov',       'DEF', 12),
  ('Akmal Mozgovoy',         'MID', 13),
  ('Otabek Shukurov',        'MID', 14),
  ('Jamshid Iskanderov',     'MID', 15),
  ('Odiljon Xamrobejov',     'MID', 16),
  ('Jaloliddin Masharipov',  'MID', 17),
  ('Oston Uronov',           'MID', 18),
  ('Dostonbek Khamdamov',    'MID', 19),
  ('Azizjon Amonov',         'MID', 20),
  ('Abbosbek Fayzullaev',    'MID', 21),
  ('Sherzod Esanov',         'MID', 22),
  ('Eldor Shomurodov',       'FWD', 23),
  ('Azizbek Amonov',         'FWD', 24),
  ('Igor Sergeev',           'FWD', 25)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'UZB'
ON CONFLICT DO NOTHING;
