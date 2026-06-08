INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Oussama Benbot',          'GK',  1),
  ('Melvin Masstil',          'GK',  2),
  ('Luca Zidane',             'GK',  3),
  ('Achraf Abada',            'DEF', 4),
  ('Rayan Ait Nouri',         'DEF', 5),
  ('Zinedine Belaid',         'DEF', 6),
  ('Rafik Belghali',          'DEF', 7),
  ('Ramy Bensebaini',         'DEF', 8),
  ('Samir Chergui',           'DEF', 9),
  ('Jaouen Hadjam',           'DEF', 10),
  ('Aïssa Mandi',             'DEF', 11),
  ('Mohamed Amine Tougai',    'DEF', 12),
  ('Houssem Aouar',           'MID', 13),
  ('Nabil Bentaleb',          'MID', 14),
  ('Hicham Boudaoui',         'MID', 15),
  ('Farès Chaïbi',            'MID', 16),
  ('Ibrahim Maza',            'MID', 17),
  ('Yassine Titraoui',        'MID', 18),
  ('Ramiz Zerrouki',          'MID', 19),
  ('Mohamed Amine Amoura',    'FWD', 20),
  ('Nadir Benbouali',         'FWD', 21),
  ('Adil Boulbina',           'FWD', 22),
  ('Fares Ghedjemis',         'FWD', 23),
  ('Amine Gouiri',            'FWD', 24),
  ('Riyad Mahrez',            'FWD', 25),
  ('Anis Hadj Moussa',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'ALG'
ON CONFLICT DO NOTHING;
