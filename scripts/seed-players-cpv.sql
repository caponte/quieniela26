INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Vozinha',              'GK',  1),
  ('Marcio Rosa',          'GK',  2),
  ('CJ dos Santos',        'GK',  3),
  ('Steven Moreira',       'DEF', 4),
  ('Wagner Pina',          'DEF', 5),
  ('Joao Paulo',           'DEF', 6),
  ('Sidny Lopes Cabral',   'DEF', 7),
  ('Logan Costa',          'DEF', 8),
  ('Pico',                 'DEF', 9),
  ('Kelvin Pires',         'DEF', 10),
  ('Stopira',              'DEF', 11),
  ('Diney',                'DEF', 12),
  ('Jamiro Monteiro',      'MID', 13),
  ('Telmo Arcanjo',        'MID', 14),
  ('Yannick Semedo',       'MID', 15),
  ('Laros Duarte',         'MID', 16),
  ('Deroy Duarte',         'MID', 17),
  ('Kevin Pina',           'MID', 18),
  ('Ryan Mendes',          'FWD', 19),
  ('Willy Semedo',         'FWD', 20),
  ('Garry Rodrigues',      'FWD', 21),
  ('Jovane Cabral',        'FWD', 22),
  ('Nuno da Costa',        'FWD', 23),
  ('Dailon Livramento',    'FWD', 24),
  ('Gilson Benchimol',     'FWD', 25),
  ('Helio Varela',         'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CPV'
ON CONFLICT DO NOTHING;
