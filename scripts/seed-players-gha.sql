INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Benjamin Asare',           'GK',  1),
  ('Lawrence Ati-Zigi',        'GK',  2),
  ('Joseph Anang',             'GK',  3),
  ('Baba Abdul Rahman',        'DEF', 4),
  ('Gideon Mensah',            'DEF', 5),
  ('Marvin Senaya',            'DEF', 6),
  ('Alidu Seidu',              'DEF', 7),
  ('Abdul Mumin',              'DEF', 8),
  ('Jerome Opoku',             'DEF', 9),
  ('Jonas Adjetey',            'DEF', 10),
  ('Kojo Oppong Peprah',       'DEF', 11),
  ('Alexander Djiku',          'DEF', 12),
  ('Elisha Owusu',             'DEF', 13),
  ('Thomas Partey',            'MID', 14),
  ('Kwasi Sibo',               'MID', 15),
  ('Augustine Boakye',         'MID', 16),
  ('Caleb Yirenkyi',           'MID', 17),
  ('Abdul Fatawu Issahaku',    'MID', 18),
  ('Kamal Deen Sulemana',      'FWD', 19),
  ('Christopher Bonsu Baah',   'FWD', 20),
  ('Ernest Nuamah',            'FWD', 21),
  ('Antoine Semenyo',          'FWD', 22),
  ('Brandon Thomas-Asante',    'FWD', 23),
  ('Prince Kwabena Adu',       'FWD', 24),
  ('Iñaki Williams',           'FWD', 25),
  ('Jordan Ayew',              'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'GHA'
ON CONFLICT DO NOTHING;
