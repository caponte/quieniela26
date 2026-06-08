INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, p.name, p.position, p.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Fahad Talib',       'GK',  1),
  ('Jalal Hassan',      'GK',  2),
  ('Ahmed Basil',       'GK',  3),
  ('Hussein Ali',       'DEF', 4),
  ('Manaf Younis',      'DEF', 5),
  ('Ahmed Yahya',       'DEF', 6),
  ('Mustafa Saadoon',   'DEF', 7),
  ('Zaid Tahseen',      'DEF', 8),
  ('Rebin Sulaka',      'DEF', 9),
  ('Akam Hashim',       'DEF', 10),
  ('Merchas Doski',     'DEF', 11),
  ('Zaid Ismail',       'DEF', 12),
  ('Frans Putros',      'DEF', 13),
  ('Amir Al-Ammari',    'MID', 14),
  ('Kevin Yakob',       'MID', 15),
  ('Zidane Iqbal',      'MID', 16),
  ('Aimar Sher',        'MID', 17),
  ('Ibrahim Bayesh',    'MID', 18),
  ('Ahmed Qasem',       'MID', 19),
  ('Youssef Amyn',      'MID', 20),
  ('Marko Farji',       'MID', 21),
  ('Ali Jassim',        'FWD', 22),
  ('Ali Al-Hamadi',     'FWD', 23),
  ('Ali Yousef',        'FWD', 24),
  ('Aymen Hussein',     'FWD', 25),
  ('Mohanad Ali',       'FWD', 26)
) AS p(name, position, jersey_number)
WHERE t.fifa_code = 'IRQ'
ON CONFLICT DO NOTHING;
