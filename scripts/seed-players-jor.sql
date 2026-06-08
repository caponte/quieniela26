INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Yazid Abulaila',          'GK',  1),
  ('Abdallah Al-Fakhouri',    'GK',  2),
  ('Nour Bani Attiah',        'GK',  3),
  ('Abdallah Nasib',          'DEF', 4),
  ('Saed Al-Rosan',           'DEF', 5),
  ('Yazan Al-Arab',           'DEF', 6),
  ('Saleem Obaid',            'DEF', 7),
  ('Mohammad Abualnadi',      'DEF', 8),
  ('Husam Abu Dahab',         'DEF', 9),
  ('Ehsan Haddad',            'DEF', 10),
  ('Anas Badawi',             'DEF', 11),
  ('Mohannad Abu Taha',       'DEF', 12),
  ('Mohammad Abu Hasheesh',   'DEF', 13),
  ('Noor Al-Rawabdeh',        'MID', 14),
  ('Nizar Al-Rashdan',        'MID', 15),
  ('Ibrahim Saadeh',          'MID', 16),
  ('Rajaei Ayed',             'MID', 17),
  ('Amer Jamous',             'MID', 18),
  ('Mohammad Al-Dawoud',      'MID', 19),
  ('Mahmoud Al-Mardi',        'MID', 20),
  ('Odeh Fakhoury',           'MID', 21),
  ('Mousa Tamari',            'MID', 22),
  ('Mohammad Abu Zrayq',      'FWD', 23),
  ('Ali Azaizeh',             'FWD', 24),
  ('Ibrahim Sabra',           'FWD', 25),
  ('Ali Olwan',               'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'JOR'
ON CONFLICT DO NOTHING;
