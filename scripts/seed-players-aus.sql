INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Patrick Beach',        'GK',  1),
  ('Paul Izzo',            'GK',  2),
  ('Mathew Ryan',          'GK',  3),
  ('Aziz Behich',          'DEF', 4),
  ('Jordan Bos',           'DEF', 5),
  ('Cameron Burgess',      'DEF', 6),
  ('Alessandro Circati',   'DEF', 7),
  ('Milos Degenek',        'DEF', 8),
  ('Jason Geria',          'DEF', 9),
  ('Lucas Herrington',     'DEF', 10),
  ('Jacob Italiano',       'DEF', 11),
  ('Harry Souttar',        'DEF', 12),
  ('Kai Trewin',           'DEF', 13),
  ('Cameron Devlin',       'MID', 14),
  ('Ajdin Hrustic',        'MID', 15),
  ('Jackson Irvine',       'MID', 16),
  ('Connor Metcalfe',      'MID', 17),
  ('Aiden O''Neill',       'MID', 18),
  ('Paul Okon-Engstler',   'MID', 19),
  ('Nestory Irankunda',    'FWD', 20),
  ('Mathew Leckie',        'FWD', 21),
  ('Awer Mabil',           'FWD', 22),
  ('Mohamed Toure',        'FWD', 23),
  ('Nishan Velupillay',    'FWD', 24),
  ('Cristian Volpato',     'FWD', 25),
  ('Tete Yengi',           'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'AUS'
ON CONFLICT DO NOTHING;
