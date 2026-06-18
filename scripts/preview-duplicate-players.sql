-- Preview duplicates — Uzbekistan & Colombia only (read-only)

-- CASE A: same fifa_player_id duplicated
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
    p.name,
    t.name AS team_name,
    p.jersey_number,
    p.fifa_player_id,
    COALESCE((SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id), 0) AS pred_refs,
    ROW_NUMBER() OVER (
      PARTITION BY p.fifa_player_id
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE p.fifa_player_id IN (SELECT fifa_player_id FROM dup_ids)
    AND t.name IN ('Uzbekistan', 'Colombia')
)
SELECT
  'CASE A' AS caso,
  CASE WHEN rn = 1 THEN 'KEEPER' ELSE 'DELETE' END AS accion,
  team_name,
  name,
  jersey_number,
  fifa_player_id,
  pred_refs,
  id
FROM ranked
ORDER BY team_name, fifa_player_id, rn;

-- CASE B: same team + jersey_number, one without fifa_player_id
WITH dup_jersey AS (
  SELECT p.team_id, p.jersey_number
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE p.jersey_number IS NOT NULL
    AND t.name IN ('Uzbekistan', 'Colombia')
  GROUP BY p.team_id, p.jersey_number
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    p.id,
    p.name,
    t.name AS team_name,
    p.jersey_number,
    p.fifa_player_id,
    COALESCE((SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id), 0) AS pred_refs,
    ROW_NUMBER() OVER (
      PARTITION BY p.team_id, p.jersey_number
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC
    ) AS rn
  FROM players p
  JOIN teams t ON t.id = p.team_id
  WHERE (p.team_id, p.jersey_number) IN (SELECT team_id, jersey_number FROM dup_jersey)
)
SELECT
  'CASE B' AS caso,
  CASE WHEN rn = 1 THEN 'KEEPER' ELSE 'DELETE' END AS accion,
  team_name,
  name,
  jersey_number,
  fifa_player_id,
  pred_refs,
  id
FROM ranked
ORDER BY team_name, jersey_number, rn;
