-- Inserta los delanteros faltantes (camisetas 24-26) de MEX y KOR.
-- Usa NOT EXISTS para evitar duplicados si el script se corre más de una vez.

-- México (Raúl Jiménez, Roberto Alvarado, Santiago Giménez)
INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, v.name, v.position::text, v.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Raúl Jiménez',     'FWD', 24),
  ('Roberto Alvarado', 'FWD', 25),
  ('Santiago Giménez', 'FWD', 26)
) AS v(name, position, jersey_number)
WHERE t.fifa_code = 'MEX'
  AND NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE team_id = t.id AND jersey_number = v.jersey_number
  );

-- Corea del Sur (Oh Hyeon-Gyu, Son Heung-Min, Cho Gue-Sung)
INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT t.id, v.name, v.position::text, v.jersey_number
FROM public.teams t
CROSS JOIN (VALUES
  ('Oh Hyeon-Gyu',  'FWD', 24),
  ('Son Heung-Min', 'FWD', 25),
  ('Cho Gue-Sung',  'FWD', 26)
) AS v(name, position, jersey_number)
WHERE t.fifa_code = 'KOR'
  AND NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE team_id = t.id AND jersey_number = v.jersey_number
  );

-- Diagnóstico completo: TODOS los jugadores de MEX y KOR
SELECT t.fifa_code, p.jersey_number, p.name, p.position
FROM public.players p
JOIN public.teams t ON t.id = p.team_id
WHERE t.fifa_code IN ('MEX', 'KOR')
ORDER BY t.fifa_code, p.jersey_number;

-- Verificar TODOS los equipos: muestra cuántos jugadores tiene cada uno
-- y marca con ⚠ los que tienen menos de 23 o más de 26 (posibles duplicados)
SELECT
  t.fifa_code,
  COUNT(p.id) AS total,
  COUNT(CASE WHEN p.position = 'GK'  THEN 1 END) AS gk,
  COUNT(CASE WHEN p.position = 'DEF' THEN 1 END) AS def,
  COUNT(CASE WHEN p.position = 'MID' THEN 1 END) AS mid,
  COUNT(CASE WHEN p.position = 'FWD' THEN 1 END) AS fwd,
  CASE
    WHEN COUNT(p.id) < 23 THEN '⚠ FALTAN jugadores'
    WHEN COUNT(p.id) > 26 THEN '⚠ DUPLICADOS'
    ELSE 'OK'
  END AS status
FROM public.teams t
LEFT JOIN public.players p ON p.team_id = t.id
GROUP BY t.fifa_code
ORDER BY status DESC, t.fifa_code;
