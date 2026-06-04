INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Alisson',            'GK',  1),
  ('Éderson',            'GK',  2),
  ('Weverton',           'GK',  3),
  ('Alex Sandro',        'DEF', 4),
  ('Bremer',             'DEF', 5),
  ('Danilo',             'DEF', 6),
  ('Douglas Santos',     'DEF', 7),
  ('Gabriel Magalhães',  'DEF', 8),
  ('Léo Pereira',        'DEF', 9),
  ('Marquinhos',         'DEF', 10),
  ('Roger Ibañez',       'DEF', 11),
  ('Wesley',             'DEF', 12),
  ('Bruno Guimarães',    'MID', 13),
  ('Casemiro',           'MID', 14),
  ('Danilo Santos',      'MID', 15),
  ('Fabinho',            'MID', 16),
  ('Lucas Paquetá',      'MID', 17),
  ('Endrick',            'FWD', 18),
  ('Gabriel Martinelli', 'FWD', 19),
  ('Igor Thiago',        'FWD', 20),
  ('Luiz Henrique',      'FWD', 21),
  ('Matheus Cunha',      'FWD', 22),
  ('Neymar',             'FWD', 23),
  ('Raphinha',           'FWD', 24),
  ('Rayan',              'FWD', 25),
  ('Vinícius Júnior',    'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'BRA'
ON CONFLICT DO NOTHING;
