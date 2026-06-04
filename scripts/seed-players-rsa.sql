INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Ronwen Williams',       'GK',  1),
  ('Ricardo Goss',          'GK',  2),
  ('Sipho Chaine',          'GK',  3),
  ('Khuliso Mudau',         'DEF', 4),
  ('Olwethu Makhanya',      'DEF', 5),
  ('Bradley Cross',         'DEF', 6),
  ('Thabang Matuludi',      'DEF', 7),
  ('Nkosinathi Sibisi',     'DEF', 8),
  ('Aubrey Modiba',         'DEF', 9),
  ('Khulumani Ndamane',     'DEF', 10),
  ('Ime Okon',              'DEF', 11),
  ('Samukele Kabini',       'DEF', 12),
  ('Mbekezeli Mbokazi',     'DEF', 13),
  ('Teboho Mokoena',        'MID', 14),
  ('Jayden Adams',          'MID', 15),
  ('Thalente Mbatha',       'MID', 16),
  ('Sphephelo Sithole',     'MID', 17),
  ('Oswin Appollis',        'FWD', 18),
  ('Tshepang Moremi',       'FWD', 19),
  ('Evidence Makgopa',      'FWD', 20),
  ('Lyle Foster',           'FWD', 21),
  ('Iqraam Rayners',        'FWD', 22),
  ('Relebohile Mofokeng',   'FWD', 23),
  ('Themba Zwane',          'FWD', 24),
  ('Kamogelo Sebelebele',   'FWD', 25),
  ('Thapelo Maseko',        'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'RSA'
ON CONFLICT DO NOTHING;
