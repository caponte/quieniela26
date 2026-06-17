-- Remove duplicate players created by map-fifa-players script.
-- For each fifa_player_id that appears more than once, keep the one that is
-- referenced in match_predictions (first_goal_scorer_id), otherwise keep the
-- one referenced in match_events, otherwise keep the oldest (lowest id lexically).

WITH duplicates AS (
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
    COALESCE((SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id), 0) AS pred_refs,
    COALESCE((SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name), 0)             AS event_refs,
    ROW_NUMBER() OVER (
      PARTITION BY p.fifa_player_id
      ORDER BY
        (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) DESC,
        (SELECT COUNT(*) FROM match_events me WHERE me.player_name = p.name) DESC,
        p.id ASC  -- tiebreak: keep earliest UUID (seeded player)
    ) AS rn
  FROM players p
  WHERE p.fifa_player_id IN (SELECT fifa_player_id FROM duplicates)
)
DELETE FROM players
WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
RETURNING name, fifa_player_id;
