-- Bracket Eliminatorio (Knockout Bracket) — second bracket mode
-- Players can submit this after group stage ends, locked before first R32 match.
-- Points are half of original bracket and accumulate into the same bracket leaderboard column.

-- ── 1. New table ──────────────────────────────────────────────────────────────
CREATE TABLE public.knockout_predictions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  picks      jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX knockout_predictions_user_id_idx ON public.knockout_predictions (user_id);
CREATE INDEX idx_knockout_predictions_user ON public.knockout_predictions (user_id);

-- ── 2. Add knockout_points to bracket_points ──────────────────────────────────
ALTER TABLE public.bracket_points
  ADD COLUMN IF NOT EXISTS knockout_points integer NOT NULL DEFAULT 0;

-- ── 3. Update leaderboard_bracket view to sum both ────────────────────────────
CREATE OR REPLACE VIEW public.leaderboard_bracket AS
SELECT
  bp.user_id,
  bp.league_id,
  u.name        AS user_name,
  u.avatar_url  AS user_avatar,
  bp.total_points + bp.knockout_points AS total_points
FROM public.bracket_points bp
JOIN public.users u ON u.id = bp.user_id;

-- ── 4. Points config entries ──────────────────────────────────────────────────
INSERT INTO public.points_config (category, points, description) VALUES
  ('knockout_round_of_32',   1, 'Bracket eliminatorio: acierto en R32'),
  ('knockout_round_of_16',   2, 'Bracket eliminatorio: acierto en Octavos'),
  ('knockout_quarter_final', 3, 'Bracket eliminatorio: acierto en Cuartos'),
  ('knockout_semi_final',    4, 'Bracket eliminatorio: acierto en Semifinal'),
  ('knockout_third_place',   4, 'Bracket eliminatorio: acierto en Tercer puesto'),
  ('knockout_final',         5, 'Bracket eliminatorio: acierto en Final/Campeón')
ON CONFLICT (category) DO UPDATE SET points = EXCLUDED.points, description = EXCLUDED.description;

-- ── 5. Scoring function ───────────────────────────────────────────────────────
-- Slot → match_number mapping mirrors the original bracket (same visual order).
-- r32[0]=M74, r32[1]=M77, r32[2]=M73, ... (same as v_r32_nums in bracket trigger)
CREATE OR REPLACE FUNCTION public.calculate_knockout_bracket_points_all()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_kp             record;
  v_total          integer;
  v_pred_id        uuid;
  v_actual_winner  uuid;
  i                integer;

  v_pts_r32   integer;
  v_pts_r16   integer;
  v_pts_qf    integer;
  v_pts_sf    integer;
  v_pts_3rd   integer;
  v_pts_final integer;

  -- Same slot-to-match_number mapping as calculate_bracket_points_all
  v_r32_nums integer[] := ARRAY[74,77,73,75,83,84,81,82,76,78,79,80,86,88,85,87];
  v_r16_nums integer[] := ARRAY[89,90,93,94,91,92,95,96];
  v_qf_nums  integer[] := ARRAY[97,98,99,100];
  v_sf_nums  integer[] := ARRAY[101,102];
BEGIN
  SELECT points INTO v_pts_r32   FROM public.points_config WHERE category = 'knockout_round_of_32';
  SELECT points INTO v_pts_r16   FROM public.points_config WHERE category = 'knockout_round_of_16';
  SELECT points INTO v_pts_qf    FROM public.points_config WHERE category = 'knockout_quarter_final';
  SELECT points INTO v_pts_sf    FROM public.points_config WHERE category = 'knockout_semi_final';
  SELECT points INTO v_pts_3rd   FROM public.points_config WHERE category = 'knockout_third_place';
  SELECT points INTO v_pts_final FROM public.points_config WHERE category = 'knockout_final';

  FOR v_kp IN SELECT * FROM public.knockout_predictions LOOP
    v_total := 0;

    -- ── Round of 32 ────────────────────────────────────────────────────────
    FOR i IN 1..16 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_r32_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_kp.picks -> 'r32' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_r32;
        END IF;
      END IF;
    END LOOP;

    -- ── Round of 16 ────────────────────────────────────────────────────────
    FOR i IN 1..8 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_r16_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_kp.picks -> 'r16' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_r16;
        END IF;
      END IF;
    END LOOP;

    -- ── Quarter finals ─────────────────────────────────────────────────────
    FOR i IN 1..4 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_qf_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_kp.picks -> 'qf' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_qf;
        END IF;
      END IF;
    END LOOP;

    -- ── Semi finals ────────────────────────────────────────────────────────
    FOR i IN 1..2 LOOP
      SELECT CASE
          WHEN home_score > away_score THEN home_team_id
          WHEN away_score > home_score THEN away_team_id
          ELSE penalty_winner_team_id
        END INTO v_actual_winner
      FROM public.matches
      WHERE match_number = v_sf_nums[i] AND status = 'finished';

      IF v_actual_winner IS NOT NULL THEN
        v_pred_id := (v_kp.picks -> 'sf' ->> (i - 1))::uuid;
        IF v_pred_id = v_actual_winner THEN
          v_total := v_total + v_pts_sf;
        END IF;
      END IF;
    END LOOP;

    -- ── Third place ────────────────────────────────────────────────────────
    SELECT CASE
        WHEN home_score > away_score THEN home_team_id
        WHEN away_score > home_score THEN away_team_id
        ELSE penalty_winner_team_id
      END INTO v_actual_winner
    FROM public.matches
    WHERE match_number = 103 AND status = 'finished';

    IF v_actual_winner IS NOT NULL THEN
      v_pred_id := (v_kp.picks ->> 'third')::uuid;
      IF v_pred_id = v_actual_winner THEN
        v_total := v_total + v_pts_3rd;
      END IF;
    END IF;

    -- ── Final / Champion ───────────────────────────────────────────────────
    SELECT CASE
        WHEN home_score > away_score THEN home_team_id
        WHEN away_score > home_score THEN away_team_id
        ELSE penalty_winner_team_id
      END INTO v_actual_winner
    FROM public.matches
    WHERE match_number = 104 AND status = 'finished';

    IF v_actual_winner IS NOT NULL THEN
      v_pred_id := (v_kp.picks ->> 'champion')::uuid;
      IF v_pred_id = v_actual_winner THEN
        v_total := v_total + v_pts_final;
      END IF;
    END IF;

    -- ── Upsert knockout_points on bracket_points ───────────────────────────
    UPDATE public.bracket_points
    SET knockout_points = v_total, updated_at = now()
    WHERE user_id = v_kp.user_id AND league_id IS NULL;

    IF NOT FOUND THEN
      INSERT INTO public.bracket_points (user_id, league_id, total_points, knockout_points, updated_at)
      VALUES (v_kp.user_id, NULL, 0, v_total, now());
    END IF;
  END LOOP;
END;
$$;

-- ── 6. Wire into existing trigger ─────────────────────────────────────────────
-- The existing after_match_finished trigger calls calculate_bracket_points_all().
-- We extend it to also call calculate_knockout_bracket_points_all().
CREATE OR REPLACE FUNCTION public.recalculate_all_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished' OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score) THEN
    PERFORM public.calculate_bracket_points_all();
    PERFORM public.calculate_knockout_bracket_points_all();
  END IF;
  RETURN NEW;
END;
$$;

-- Replace the existing trigger if it exists, otherwise create it
DROP TRIGGER IF EXISTS after_match_finished ON public.matches;
CREATE TRIGGER after_match_finished
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_all_points();

-- ── 7. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.knockout_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own knockout prediction"
  ON public.knockout_predictions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "knockout predictions are public"
  ON public.knockout_predictions
  FOR SELECT
  USING (true);
