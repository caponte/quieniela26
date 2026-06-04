INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Yassine Bounou',         'GK',  1),
  ('Munir Kajoui',           'GK',  2),
  ('Ahmed Reda Tagnaouti',   'GK',  3),
  ('Achraf Hakimi',          'DEF', 4),
  ('Noussair Mazraoui',      'DEF', 5),
  ('Anass Salah-Eddine',     'DEF', 6),
  ('Youssef Belammari',      'DEF', 7),
  ('Issa Diop',              'DEF', 8),
  ('Chadi Riad',             'DEF', 9),
  ('Zakaria El Ouahdi',      'DEF', 10),
  ('Redouane Halhal',        'DEF', 11),
  ('Nayef Aguerd',           'DEF', 12),
  ('Neil El Aynaoui',        'MID', 13),
  ('Azzedine Ounahi',        'MID', 14),
  ('Ismael Saibari',         'MID', 15),
  ('Bilal El Khannouss',     'MID', 16),
  ('Samir El Mourabet',      'MID', 17),
  ('Sofyan Amrabat',         'MID', 18),
  ('Ayyoub Bouaddi',         'MID', 19),
  ('Brahim Díaz',            'FWD', 20),
  ('Ayoub El Kaabi',         'FWD', 21),
  ('Abde Ezzalzouli',        'FWD', 22),
  ('Soufiane Rahimi',        'FWD', 23),
  ('Yassine Gessime',        'FWD', 24),
  ('Ayoub Amaimouni',        'FWD', 25),
  ('Chemsdine Talbi',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'MAR'
ON CONFLICT DO NOTHING;
