INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Dominik Livakovic',   'GK',  1),
  ('Dominik Kotarski',    'GK',  2),
  ('Ivor Pandur',         'GK',  3),
  ('Josko Gvardiol',      'DEF', 4),
  ('Duje Caleta-Car',     'DEF', 5),
  ('Josip Sutalo',        'DEF', 6),
  ('Josip Stanisic',      'DEF', 7),
  ('Marin Pongracic',     'DEF', 8),
  ('Martin Erlic',        'DEF', 9),
  ('Luka Vuskovic',       'DEF', 10),
  ('Luka Modric',         'MID', 11),
  ('Mateo Kovacic',       'MID', 12),
  ('Mario Pasalic',       'MID', 13),
  ('Nikola Vlasic',       'MID', 14),
  ('Luka Sucic',          'MID', 15),
  ('Martin Baturina',     'MID', 16),
  ('Kristijan Jakic',     'MID', 17),
  ('Petar Sucic',         'MID', 18),
  ('Nikola Moro',         'MID', 19),
  ('Toni Fruk',           'MID', 20),
  ('Ivan Perisic',        'FWD', 21),
  ('Andrej Kramaric',     'FWD', 22),
  ('Ante Budimir',        'FWD', 23),
  ('Marco Pasalic',       'FWD', 24),
  ('Petar Musa',          'FWD', 25),
  ('Igor Matanovic',      'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'CRO'
ON CONFLICT DO NOTHING;
