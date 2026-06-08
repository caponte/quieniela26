INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Nawaf Al Aqidi',          'GK',  1),
  ('Mohamed Al Owais',        'GK',  2),
  ('Ahmed Alkassar',          'GK',  3),
  ('Saud Abdulhamid',         'DEF', 4),
  ('Jehad Thakri',            'DEF', 5),
  ('Abdulelah Al Amri',       'DEF', 6),
  ('Hassan Tambakti',         'DEF', 7),
  ('Ali Lajami',              'DEF', 8),
  ('Hassan Kadesh',           'DEF', 9),
  ('Moteb Al Harbi',          'DEF', 10),
  ('Nawaf Boushal',           'DEF', 11),
  ('Ali Majrashi',            'DEF', 12),
  ('Mohammed Abu Alshamat',   'DEF', 13),
  ('Ziyad Al Johani',         'MID', 14),
  ('Nasser Al Dawsari',       'MID', 15),
  ('Mohamed Kanno',           'MID', 16),
  ('Abdullah Al Khaibari',    'MID', 17),
  ('Alaa Al Hejji',           'MID', 18),
  ('Musab Al Juwayr',         'MID', 19),
  ('Sultan Mandash',          'MID', 20),
  ('Ayman Yahya',             'MID', 21),
  ('Khalid Al Ghannam',       'MID', 22),
  ('Salem Al Dawsari',        'FWD', 23),
  ('Abdullah Al Hamdan',      'FWD', 24),
  ('Feras Al Brikan',         'FWD', 25),
  ('Saleh Al Shehri',         'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'KSA'
ON CONFLICT DO NOTHING;
