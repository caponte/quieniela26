INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Nikola Vasilj',           'GK',  1),
  ('Martin Zlomislić',        'GK',  2),
  ('Osman Hadžikić',          'GK',  3),
  ('Sead Kolašinac',          'DEF', 4),
  ('Amar Dedić',              'DEF', 5),
  ('Nihad Mujakić',           'DEF', 6),
  ('Nikola Katić',            'DEF', 7),
  ('Tarik Muharemović',       'DEF', 8),
  ('Stjepan Radeljić',        'DEF', 9),
  ('Dennis Hadžikadunić',     'DEF', 10),
  ('Nidal Čelik',             'DEF', 11),
  ('Amir Hadžiahmetović',     'MID', 12),
  ('Ivan Šunjić',             'MID', 13),
  ('Ivan Bašić',              'MID', 14),
  ('Dženis Burnić',           'MID', 15),
  ('Ermin Mahmić',            'MID', 16),
  ('Benjamin Tahirović',      'MID', 17),
  ('Amar Memić',              'MID', 18),
  ('Armin Gigović',           'MID', 19),
  ('Kerim Alajbegović',       'MID', 20),
  ('Esmir Bajraktarević',     'MID', 21),
  ('Ermedin Demirović',       'FWD', 22),
  ('Jovo Lukić',              'FWD', 23),
  ('Samed Baždar',            'FWD', 24),
  ('Haris Tabaković',         'FWD', 25),
  ('Edin Džeko',              'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'BIH'
ON CONFLICT DO NOTHING;
