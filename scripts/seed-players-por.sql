INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Diogo Costa',          'GK',  1),
  ('José Sá',              'GK',  2),
  ('Rui Silva',            'GK',  3),
  ('Rúben Dias',           'DEF', 4),
  ('João Cancelo',         'DEF', 5),
  ('Diogo Dalot',          'DEF', 6),
  ('Nuno Mendes',          'DEF', 7),
  ('Nélson Semedo',        'DEF', 8),
  ('Matheus Nunes',        'DEF', 9),
  ('Gonçalo Inácio',       'DEF', 10),
  ('Renato Veiga',         'DEF', 11),
  ('Tomás Araújo',         'DEF', 12),
  ('Bruno Fernandes',      'MID', 13),
  ('Bernardo Silva',       'MID', 14),
  ('Vitinha',              'MID', 15),
  ('João Neves',           'MID', 16),
  ('Rúben Neves',          'MID', 17),
  ('Samú Costa',           'MID', 18),
  ('Cristiano Ronaldo',    'FWD', 19),
  ('Rafael Leão',          'FWD', 20),
  ('João Félix',           'FWD', 21),
  ('Gonçalo Ramos',        'FWD', 22),
  ('Pedro Neto',           'FWD', 23),
  ('Francisco Conceição',  'FWD', 24),
  ('Gonçalo Guedes',       'FWD', 25),
  ('Francisco Trincão',    'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'POR'
ON CONFLICT DO NOTHING;
