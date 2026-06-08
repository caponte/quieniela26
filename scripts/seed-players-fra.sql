INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Mike Maignan',          'GK',  1),
  ('Robin Risser',          'GK',  2),
  ('Brice Samba',           'GK',  3),
  ('Lucas Digne',           'DEF', 4),
  ('Malo Gusto',            'DEF', 5),
  ('Lucas Hernández',       'DEF', 6),
  ('Theo Hernández',        'DEF', 7),
  ('Ibrahima Konaté',       'DEF', 8),
  ('Jules Koundé',          'DEF', 9),
  ('Maxence Lacroix',       'DEF', 10),
  ('William Saliba',        'DEF', 11),
  ('Dayot Upamecano',       'DEF', 12),
  ('N''Golo Kanté',         'MID', 13),
  ('Manu Koné',             'MID', 14),
  ('Adrien Rabiot',         'MID', 15),
  ('Aurélien Tchouaméni',   'MID', 16),
  ('Warren Zaïre-Emery',    'MID', 17),
  ('Maghnes Akliouche',     'FWD', 18),
  ('Bradley Barcola',       'FWD', 19),
  ('Rayan Cherki',          'FWD', 20),
  ('Ousmane Dembélé',       'FWD', 21),
  ('Désiré Doué',           'FWD', 22),
  ('Jean-Philippe Mateta',  'FWD', 23),
  ('Kylian Mbappé',         'FWD', 24),
  ('Michael Olise',         'FWD', 25),
  ('Marcus Thuram',         'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'FRA'
ON CONFLICT DO NOTHING;
