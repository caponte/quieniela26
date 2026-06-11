-- Fix: UNIQUE constraint on match_predictions doesn't treat NULLs as equal in Postgres,
-- so (user_id, match_id, NULL) can be inserted multiple times.
-- This caused duplicate rows and inflated leaderboard totals.

-- Step 1: Delete duplicate predictions (keep the latest per user/match where league_id IS NULL)
DELETE FROM public.match_predictions
WHERE league_id IS NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, match_id) id
    FROM public.match_predictions
    WHERE league_id IS NULL
    ORDER BY user_id, match_id, submitted_at DESC
  );

-- Step 2: Replace the constraint with one that treats NULLs as equal (Postgres 15+)
ALTER TABLE public.match_predictions
  DROP CONSTRAINT match_predictions_user_id_match_id_league_id_key;

ALTER TABLE public.match_predictions
  ADD CONSTRAINT match_predictions_user_id_match_id_league_id_key
  UNIQUE NULLS NOT DISTINCT (user_id, match_id, league_id);

-- Step 3: Recalculate points for all finished matches (cascade-delete on match_predictions
-- already removed orphaned match_points rows via ON DELETE CASCADE)
SELECT public.calculate_match_points(id)
FROM public.matches
WHERE status = 'finished';
