INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Alireza Beiranvand',        'GK',  1),
  ('Hossein Hosseini',          'GK',  2),
  ('Payam Niazmand',            'GK',  3),
  ('Danial Eiri',               'DEF', 4),
  ('Ehsan Hajsafi',             'DEF', 5),
  ('Saleh Hardani',             'DEF', 6),
  ('Hossein Kanaani',           'DEF', 7),
  ('Shoka Khalilzadeh',         'DEF', 8),
  ('Milad Mohammadi',           'DEF', 9),
  ('Ali Nemati',                'DEF', 10),
  ('Omid Noorafkan',            'DEF', 11),
  ('Ramin Rezaeian',            'DEF', 12),
  ('Rouzbeh Cheshmi',           'MID', 13),
  ('Saeid Ezatolahi',           'MID', 14),
  ('Mehdi Ghaedi',              'MID', 15),
  ('Saman Ghoddos',             'MID', 16),
  ('Mohammad Ghorbani',         'MID', 17),
  ('Alireza Jahanbakhsh',       'MID', 18),
  ('Mohammad Mohebi',           'MID', 19),
  ('Amir Mohammad Razzaghinia', 'MID', 20),
  ('Mehdi Torabi',              'MID', 21),
  ('Aria Yousefi',              'MID', 22),
  ('Ali Alipour',               'FWD', 23),
  ('Dennis Dargahi',            'FWD', 24),
  ('Amirhossein Hosseinzadeh',  'FWD', 25),
  ('Mehdi Taremi',              'FWD', 26),
  ('Shahriyar Moghanloo',       'FWD', 27)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'IRN'
ON CONFLICT DO NOTHING;
