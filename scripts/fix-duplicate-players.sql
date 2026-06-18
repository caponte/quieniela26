-- Fix duplicate players created by map-fifa-players script.
--
-- Two cases handled:
--
-- CASE A — mismo fifa_player_id en dos registros (script corrió dos veces).
--   Solución: transferir fifa_player_id al jugador con predicciones y borrar el otro.
--
-- CASE B — mismo team_id + jersey_number, uno viejo (sin fifa_player_id, con predicciones)
--          y uno nuevo (con fifa_player_id, sin predicciones).
--   Solución: copiar fifa_player_id al viejo y borrar el nuevo.
--
-- Correr en el SQL editor de Supabase. Es seguro ejecutarlo varias veces.

-- ── CASE A: mismo fifa_player_id ──────────────────────────────────────────────

-- Paso 1A: copiar fifa_player_id al keeper si acaso no lo tiene
WITH dup_ids AS (
  SELECT fifa_player_id
  FROM players
  WHERE fifa_player_id IS NOT NULL
  GROUP BY fifa_player_id
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.fifa_player_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.fifa_player_id
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  WHERE p.fifa_player_id IN (SELECT fifa_player_id FROM dup_ids)
),
keepers AS (SELECT id, fifa_player_id FROM ranked WHERE rn = 1)
UPDATE players p
SET fifa_player_id = k.fifa_player_id
FROM keepers k
WHERE p.id = k.id
  AND p.fifa_player_id IS DISTINCT FROM k.fifa_player_id;

-- Paso 2A: borrar los no-keepers
WITH dup_ids AS (
  SELECT fifa_player_id
  FROM players
  WHERE fifa_player_id IS NOT NULL
  GROUP BY fifa_player_id
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.fifa_player_id,
    p.name,
    ROW_NUMBER() OVER (
      PARTITION BY p.fifa_player_id
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  WHERE p.fifa_player_id IN (SELECT fifa_player_id FROM dup_ids)
)
DELETE FROM players
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING name, fifa_player_id;

-- ── CASE B: mismo team_id + jersey_number, uno viejo sin fifa_player_id ───────

-- Paso 1B: copiar fifa_player_id del nuevo al viejo
WITH dup_jersey AS (
  SELECT team_id, jersey_number
  FROM players
  WHERE jersey_number IS NOT NULL
  GROUP BY team_id, jersey_number
  HAVING COUNT(*) > 1
),
pairs AS (
  SELECT
    p.id,
    p.team_id,
    p.jersey_number,
    p.fifa_player_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.team_id, p.jersey_number
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  WHERE (p.team_id, p.jersey_number) IN (SELECT team_id, jersey_number FROM dup_jersey)
),
keepers AS (SELECT id, team_id, jersey_number FROM pairs WHERE rn = 1),
donors  AS (SELECT team_id, jersey_number, fifa_player_id FROM pairs WHERE rn > 1 AND fifa_player_id IS NOT NULL)
UPDATE players p
SET fifa_player_id = d.fifa_player_id
FROM keepers k
JOIN donors d USING (team_id, jersey_number)
WHERE p.id = k.id
  AND p.fifa_player_id IS NULL;

-- Paso 2B: borrar los duplicados por jersey
WITH dup_jersey AS (
  SELECT team_id, jersey_number
  FROM players
  WHERE jersey_number IS NOT NULL
  GROUP BY team_id, jersey_number
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.name,
    p.fifa_player_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.team_id, p.jersey_number
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  WHERE (p.team_id, p.jersey_number) IN (SELECT team_id, jersey_number FROM dup_jersey)
)
DELETE FROM players
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING name, fifa_player_id;
