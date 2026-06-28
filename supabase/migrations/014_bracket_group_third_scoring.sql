-- Add bracket_group_third scoring to calculate_bracket_points_all.
-- The r32_third picks (best-third-place qualifiers) were being shown as livePoints
-- in the frontend but never written to bracket_points.total_points in the DB.
CREATE OR REPLACE FUNCTION public.calculate_bracket_points_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bp            record;
  v_total         integer;
  v_thirds_pts    integer;
  v_pred_id       uuid;
  v_actual_winner uuid;
  v_actual_1st    uuid;
  v_actual_2nd    uuid;
  v_group         text;
  i               integer;

  v_pts_grp_1st   integer;
  v_pts_grp_2nd   integer;
  v_pts_grp_third integer;
  v_pts_r32       integer;
  v_pts_r16       integer;
  v_pts_qf        integer;
  v_pts_sf        integer;
  v_pts_final     integer;

  v_top8_thirds   uuid[];

  v_r32_nums integer[] := ARRAY[74,77,73,75,83,84,81,82,76,78,79,80,86,88,85,87];
  v_r16_nums integer[] := ARRAY[89,90,93,94,91,92,95,96];
  v_qf_nums  integer[] := ARRAY[97,98,99,100];
  v_sf_nums  integer[] := ARRAY[101,102];
  v_groups   text[]   := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L'];
BEGIN
  SELECT points INTO v_pts_grp_1st   FROM public.points_config WHERE category = 'bracket_group_first';
  SELECT points INTO v_pts_grp_2nd   FROM public.points_config WHERE category = 'bracket_group_second';
  SELECT points INTO v_pts_grp_third FROM public.points_config WHERE category = 'bracket_group_third';
  SELECT points INTO v_pts_r32       FROM public.points_config WHERE category = 'bracket_round_of_32';
  SELECT points INTO v_pts_r16       FROM public.points_config WHERE category = 'bracket_round_of_16';
  SELECT points INTO v_pts_qf        FROM public.points_config WHERE category = 'bracket_quarter_final';
  SELECT points INTO v_pts_sf        FROM public.points_config WHERE category = 'bracket_semi_final';
  SELECT points INTO v_pts_final     FROM public.points_config WHERE category = 'bracket_final';

  v_pts_grp_third := COALESCE(v_pts_grp_third, 1);

  -- Compute top-8 third-place teams (mirrors frontend calcTop8Thirds: pts → GD → GF).
  SELECT ARRAY(
    SELECT team_id
    FROM (
      SELECT
        group_name,
        team_id,
        SUM(pts) AS pts,
        SUM(gd)  AS gd,
        SUM(gf)  AS gf,
        ROW_NUMBER() OVER (
          PARTITION BY group_name
          ORDER BY SUM(pts) DESC, SUM(gd) DESC, SUM(gf) DESC
        ) AS rnk
      FROM (
        SELECT group_name, home_team_id AS team_id,
               CASE WHEN home_score > away_score THEN 3 WHEN home_score = away_score THEN 1 ELSE 0 END AS pts,
               home_score - away_score AS gd,
               home_score             AS gf
        FROM public.matches
        WHERE stage = 'group' AND status = 'finished' AND home_score IS NOT NULL
        UNION ALL
        SELECT group_name, away_team_id AS team_id,
               CASE WHEN away_score > home_score THEN 3 WHEN home_score = away_score THEN 1 ELSE 0 END AS pts,
               away_score - home_score AS gd,
               away_score             AS gf
        FROM public.matches
        WHERE stage = 'group' AND status = 'finished' AND away_score IS NOT NULL
      ) match_rows
      GROUP BY group_name, team_id
    ) team_stats
    WHERE rnk = 3
    ORDER BY pts DESC, gd DESC, gf DESC
    LIMIT 8
  ) INTO v_top8_thirds;

  FOR v_bp IN SELECT * FROM public.bracket_predictions LOOP
    v_total := 0;

    -- ── Group stage (1st / 2nd) ───────────────────────────────────────────────
    FOREACH v_group IN ARRAY v_groups LOOP
      IF (SELECT COUNT(*) FROM public.matches
            WHERE group_name = v_group AND stage = 'group' AND status = 'finished') < 6 THEN
        CONTINUE;
      END IF;

      SELECT team_id INTO v_actual_1st FROM public.group_standings
        WHERE group_name = v_group AND rank = 1;
      SELECT team_id INTO v_actual_2nd FROM public.group_standings
        WHERE group_name = v_group AND rank = 2;

      v_pred_id := (v_bp.predictions -> 'groups' -> v_group ->> 'first')::uuid;
      IF v_actual_1st IS NOT NULL AND v_pred_id = v_actual_1st THEN
        v_total := v_total + v_pts_grp_1st;
      END IF;

      v_pred_id := (v_bp.predictions -> 'groups' -> v_group ->> 'second')::uuid;
      IF v_actual_2nd IS NOT NULL AND v_pred_id = v_actual_2nd THEN
        v_total := v_total + v_pts_grp_2nd;
      END IF;
    END LOOP;

    -- ── Best-third picks (r32_third) ──────────────────────────────────────────
    -- Award 1 pt per unique pick that ended up in the top-8 third-place set,
    -- regardless of order (mirrors frontend calcBreakdown logic).
    IF v_top8_thirds IS NOT NULL AND array_length(v_top8_thirds, 1) > 0
       AND (v_bp.predictions -> 'r32_third') IS NOT NULL
       AND jsonb_typeof(v_bp.predictions -> 'r32_third') = 'array' THEN
      SELECT COALESCE(SUM(
        CASE WHEN elem_val::uuid = ANY(v_top8_thirds) THEN v_pts_grp_third ELSE 0 END
      ), 0) INTO v_thirds_pts
      FROM (
        SELECT DISTINCT (elem.value #>> '{}') AS elem_val
        FROM jsonb_array_elements(v_bp.predictions -> 'r32_third') AS elem
        WHERE elem.value #>> '{}' IS NOT NULL AND elem.value #>> '{}' != ''
      ) uniq;
      v_total := v_total + COALESCE(v_thirds_pts, 0);
    END IF;

    -- ── Round of 32 ──────────────────────────────────────────────────────────
    FOR i IN 1..16 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_r32_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_bp.predictions -> 'r32' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_r32;
        END IF;
      END IF;
    END LOOP;

    -- ── Round of 16 ──────────────────────────────────────────────────────────
    FOR i IN 1..8 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_r16_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_bp.predictions -> 'r16' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_r16;
        END IF;
      END IF;
    END LOOP;

    -- ── Quarter finals ───────────────────────────────────────────────────────
    FOR i IN 1..4 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_qf_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_bp.predictions -> 'qf' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_qf;
        END IF;
      END IF;
    END LOOP;

    -- ── Semi finals ──────────────────────────────────────────────────────────
    FOR i IN 1..2 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_sf_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_bp.predictions -> 'sf' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_sf;
        END IF;
      END IF;
    END LOOP;

    -- ── Final / Champion ─────────────────────────────────────────────────────
    SELECT CASE
        WHEN home_score > away_score THEN home_team_id
        WHEN away_score > home_score THEN away_team_id
        ELSE penalty_winner_team_id
      END INTO v_actual_winner
    FROM public.matches
    WHERE match_number = 104 AND status = 'finished';

    IF v_actual_winner IS NOT NULL THEN
      v_pred_id := (v_bp.predictions ->> 'champion')::uuid;
      IF v_pred_id = v_actual_winner THEN
        v_total := v_total + v_pts_final;
      END IF;
    END IF;

    -- ── Upsert bracket_points (safe for NULL league_id) ──────────────────────
    UPDATE public.bracket_points
    SET total_points = v_total, updated_at = now()
    WHERE user_id = v_bp.user_id
      AND league_id IS NOT DISTINCT FROM v_bp.league_id;

    IF NOT FOUND THEN
      INSERT INTO public.bracket_points (user_id, league_id, total_points, updated_at)
      VALUES (v_bp.user_id, v_bp.league_id, v_total, now());
    END IF;
  END LOOP;
END;
$$;

-- Backfill: recalculate now including best-third scoring.
SELECT public.calculate_bracket_points_all();
