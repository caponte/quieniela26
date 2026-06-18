-- Fix Colombia roster:
-- Old DB had wrong jersey numbers — jersey-based dedup is unsafe.
-- Strategy:
--   1. Transfer fifa_player_id to old entries that have pred_refs (by name match)
--   2. Delete new FIFA entries whose name matched an old pred_refs entry
--   3. Delete all remaining old entries with no pred_refs and no fifa_player_id

-- ── Step 1: transfer fifa_player_id by name to old entries with predictions ───
UPDATE players keeper
SET fifa_player_id = donor.fifa_player_id
FROM players donor
JOIN teams t ON t.id = donor.team_id
WHERE t.name = 'Colombia'
  AND t.id = keeper.team_id
  AND keeper.id <> donor.id
  AND keeper.fifa_player_id IS NULL
  AND donor.fifa_player_id IS NOT NULL
  AND (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = keeper.id) > 0
  AND lower(translate(keeper.name, 'áéíóúàèìòùäëïöüâêîôûñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
                                   'aeiouaeiouaeiouaeiounAEIOUAEIOUAEIOUAEIOUN'))
    = lower(translate(donor.name,  'áéíóúàèìòùäëïöüâêîôûñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ',
                                   'aeiouaeiouaeiouaeiounAEIOUAEIOUAEIOUAEIOUN'));

-- ── Step 2: delete FIFA entries whose name was transferred to an old entry ─────
DELETE FROM players donor
USING teams t
WHERE t.id = donor.team_id
  AND t.name = 'Colombia'
  AND donor.fifa_player_id IS NOT NULL
  AND (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = donor.id) = 0
  AND EXISTS (
    SELECT 1 FROM players keeper
    WHERE keeper.team_id = donor.team_id
      AND keeper.id <> donor.id
      AND keeper.fifa_player_id = donor.fifa_player_id
      AND (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = keeper.id) > 0
  )
RETURNING donor.name, donor.fifa_player_id;

-- ── Step 3: delete all remaining old Colombia entries with no pred_refs ────────
-- (the FIFA roster entries are the correct ones and will remain)
DELETE FROM players p
USING teams t
WHERE t.id = p.team_id
  AND t.name = 'Colombia'
  AND p.fifa_player_id IS NULL
  AND (SELECT COUNT(*) FROM match_predictions mp WHERE mp.first_goal_scorer_id = p.id) = 0
RETURNING p.name;
