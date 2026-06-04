INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Aymen Dahmen',              'GK',  1),
  ('Sabri Ben Hessen',          'GK',  2),
  ('Abdelmouhib Chamakh',       'GK',  3),
  ('Montassar Talbi',           'DEF', 4),
  ('Dylan Bronn',               'DEF', 5),
  ('Omar Rekik',                'DEF', 6),
  ('Yan Valery',                'DEF', 7),
  ('Ali Abdi',                  'DEF', 8),
  ('Moutaz Neffati',            'DEF', 9),
  ('Raed Chikhaoui',            'DEF', 10),
  ('Adam Arous',                'DEF', 11),
  ('Mohamed Amine Ben Hamida',  'DEF', 12),
  ('Ellyes Skhiri',             'MID', 13),
  ('Hannibal Mejbri',           'MID', 14),
  ('Anis Ben Slimane',          'MID', 15),
  ('Hadj Mahmoud',              'MID', 16),
  ('Rani Khedira',              'MID', 17),
  ('Mortadha Ben Ouanes',       'MID', 18),
  ('Elias Achouri',             'FWD', 19),
  ('Ismaël Gharbi',             'FWD', 20),
  ('Elias Saad',                'FWD', 21),
  ('Sebastian Tounekti',        'FWD', 22),
  ('Firas Chaouat',             'FWD', 23),
  ('Khalil Ayari',              'FWD', 24),
  ('Hazem Mastouri',            'FWD', 25),
  ('Rayan Elloumi',             'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'TUN'
ON CONFLICT DO NOTHING;
