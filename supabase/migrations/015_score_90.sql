-- Add 90-minute score columns to matches for KO rounds.
-- For group stage matches these stay NULL (unused).
-- For KO matches, home_score_90 / away_score_90 hold the score at the end of
-- regular time (≤ 90'), so extra-time goals are excluded from jornada scoring.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_score_90 integer,
  ADD COLUMN IF NOT EXISTS away_score_90 integer;

-- Updated calculate_match_points: use 90-min score for KO stages.
-- Falls back to home_score/away_score when home_score_90 is NULL (already-finished
-- KO matches from before this migration, which had no ET goals anyway).
CREATE OR REPLACE FUNCTION public.calculate_match_points(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_first_goal_team_id uuid;
  v_first_goal_scorer text;
  v_has_penalty boolean;
  v_pred public.match_predictions%ROWTYPE;
  v_base integer;
  v_bonus integer;
  v_breakdown jsonb;
  v_cfg jsonb;
  v_eff_home integer;
  v_eff_away integer;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF v_match.status != 'finished' THEN RETURN; END IF;

  -- Build points config map
  SELECT jsonb_object_agg(category, points) INTO v_cfg FROM public.points_config;

  -- For KO stages use the 90-min score; for group stage (or when not yet populated)
  -- fall back to the stored full-time score.
  IF v_match.stage = 'group' THEN
    v_eff_home := v_match.home_score;
    v_eff_away := v_match.away_score;
  ELSE
    v_eff_home := COALESCE(v_match.home_score_90, v_match.home_score);
    v_eff_away := COALESCE(v_match.away_score_90, v_match.away_score);
  END IF;

  -- Get first goal team and scorer
  SELECT team_id, player_name INTO v_first_goal_team_id, v_first_goal_scorer
  FROM public.match_events
  WHERE match_id = p_match_id AND type = 'goal' AND is_first_goal = true
  LIMIT 1;

  -- Check if there was any penalty
  SELECT EXISTS(
    SELECT 1 FROM public.match_events
    WHERE match_id = p_match_id AND type = 'penalty'
  ) INTO v_has_penalty;

  FOR v_pred IN SELECT * FROM public.match_predictions WHERE match_id = p_match_id LOOP
    v_base := 0;
    v_bonus := 0;
    v_breakdown := '{}';

    -- Base points: exact score
    IF v_pred.home_goals = v_eff_home AND v_pred.away_goals = v_eff_away THEN
      v_base := (v_cfg->>'exact_score')::integer;
      v_breakdown := v_breakdown || '{"exact_score": true}';
    -- Base points: correct winner/draw
    ELSIF (v_pred.home_goals > v_pred.away_goals AND v_eff_home > v_eff_away)
       OR (v_pred.home_goals < v_pred.away_goals AND v_eff_home < v_eff_away)
       OR (v_pred.home_goals = v_pred.away_goals AND v_eff_home = v_eff_away) THEN
      v_base := (v_cfg->>'correct_winner')::integer;
      v_breakdown := v_breakdown || '{"correct_winner": true}';
    END IF;

    -- Bonus: home goals exact
    IF v_pred.home_goals = v_eff_home THEN
      v_bonus := v_bonus + (v_cfg->>'home_goals_exact')::integer;
      v_breakdown := v_breakdown || '{"home_goals_exact": true}';
    END IF;

    -- Bonus: away goals exact
    IF v_pred.away_goals = v_eff_away THEN
      v_bonus := v_bonus + (v_cfg->>'away_goals_exact')::integer;
      v_breakdown := v_breakdown || '{"away_goals_exact": true}';
    END IF;

    -- Bonus: first team to score
    IF v_first_goal_team_id IS NOT NULL AND v_pred.first_team_to_score = v_first_goal_team_id THEN
      v_bonus := v_bonus + (v_cfg->>'first_team_to_score')::integer;
      v_breakdown := v_breakdown || '{"first_team_to_score": true}';
    END IF;

    -- Bonus: first goal scorer
    IF v_first_goal_scorer IS NOT NULL
      AND v_pred.first_goal_scorer IS NOT NULL
      AND lower(trim(v_pred.first_goal_scorer)) = lower(trim(v_first_goal_scorer)) THEN
      v_bonus := v_bonus + (v_cfg->>'first_goal_scorer')::integer;
      v_breakdown := v_breakdown || '{"first_goal_scorer": true}';
    END IF;

    -- Bonus: penalty prediction
    IF v_pred.has_penalty = v_has_penalty THEN
      v_bonus := v_bonus + (v_cfg->>'has_penalty')::integer;
      v_breakdown := v_breakdown || '{"has_penalty": true}';
    END IF;

    INSERT INTO public.match_points (prediction_id, base_points, bonus_points, total_points, breakdown, calculated_at)
    VALUES (v_pred.id, v_base, v_bonus, v_base + v_bonus, v_breakdown, now())
    ON CONFLICT (prediction_id) DO UPDATE
      SET base_points = EXCLUDED.base_points,
          bonus_points = EXCLUDED.bonus_points,
          total_points = EXCLUDED.total_points,
          breakdown = EXCLUDED.breakdown,
          calculated_at = EXCLUDED.calculated_at;
  END LOOP;
END;
$$;

-- Update trigger to also fire when home_score_90/away_score_90 change on a finished match
CREATE OR REPLACE FUNCTION public.trigger_calculate_match_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'finished' AND (
    OLD.status != 'finished'
    OR OLD.home_score IS DISTINCT FROM NEW.home_score
    OR OLD.away_score IS DISTINCT FROM NEW.away_score
    OR OLD.home_score_90 IS DISTINCT FROM NEW.home_score_90
    OR OLD.away_score_90 IS DISTINCT FROM NEW.away_score_90
  ) THEN
    PERFORM public.calculate_match_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
