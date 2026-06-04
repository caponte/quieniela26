DELETE FROM public.players WHERE team_id = (SELECT id FROM public.teams WHERE fifa_code = 'TUR');

INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Altay Bayindir',       'GK',  1),
  ('Mert Günok',           'GK',  2),
  ('Ugurcan Çakir',        'GK',  3),
  ('Abdülkerim Bardakci',  'DEF', 4),
  ('Merih Demiral',        'DEF', 5),
  ('Çaglar Söyüncü',       'DEF', 6),
  ('Eren Elmali',          'DEF', 7),
  ('Ferdi Kadioglu',       'DEF', 8),
  ('Mert Müldür',          'DEF', 9),
  ('Ozan Kabak',           'DEF', 10),
  ('Samet Akaydin',        'DEF', 11),
  ('Zeki Çelik',           'DEF', 12),
  ('Hakan Çalhanoğlu',     'MID', 13),
  ('Ismail Yüksek',        'MID', 14),
  ('Kaan Ayhan',           'MID', 15),
  ('Orkun Kökçü',          'MID', 16),
  ('Salih Özcan',          'MID', 17),
  ('Arda Güler',           'FWD', 18),
  ('Baris Alper Yilmaz',   'FWD', 19),
  ('Can Uzun',             'FWD', 20),
  ('Deniz Gül',            'FWD', 21),
  ('Irfan Can Kahveci',    'FWD', 22),
  ('Kenan Yildiz',         'FWD', 23),
  ('Kareem Aktürkoğlu',    'FWD', 24),
  ('Oguz Aydin',           'FWD', 25),
  ('Yunus Akgün',          'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'TUR';
