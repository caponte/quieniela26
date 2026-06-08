INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Édouard Mendy',          'GK',  1),
  ('Mory Diaw',              'GK',  2),
  ('Yehvann Diouf',          'GK',  3),
  ('Krépin Diatta',          'DEF', 4),
  ('Antoine Mendy',          'DEF', 5),
  ('Kalidou Koulibaly',      'DEF', 6),
  ('El Hadji Malick Diouf',  'DEF', 7),
  ('Mamadou Sarr',           'DEF', 8),
  ('Moussa Niakhaté',        'DEF', 9),
  ('Abdoulaye Seck',         'DEF', 10),
  ('Ismail Jakobs',          'DEF', 11),
  ('Idrissa Gana Gueye',     'MID', 12),
  ('Pape Gueye',             'MID', 13),
  ('Lamine Camara',          'MID', 14),
  ('Habib Diarra',           'MID', 15),
  ('Pathé Ciss',             'MID', 16),
  ('Pape Matar Sarr',        'MID', 17),
  ('Bara Sapoko Ndiaye',     'MID', 18),
  ('Sadio Mané',             'FWD', 19),
  ('Ismaïla Sarr',           'FWD', 20),
  ('Iliman Ndiaye',          'FWD', 21),
  ('Assane Diao',            'FWD', 22),
  ('Ibrahim Mbaye',          'FWD', 23),
  ('Nicolas Jackson',        'FWD', 24),
  ('Bamba Dieng',            'FWD', 25),
  ('Cherif Ndiaye',          'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'SEN'
ON CONFLICT DO NOTHING;
