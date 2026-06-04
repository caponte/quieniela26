-- Enums
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');
CREATE TYPE match_stage AS ENUM (
  'group', 'round_of_32', 'round_of_16',
  'quarter_final', 'semi_final', 'third_place', 'final'
);
CREATE TYPE event_type AS ENUM ('goal', 'penalty', 'red_card', 'yellow_card');
CREATE TYPE league_member_role AS ENUM ('owner', 'member');

-- Users (mirrors auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  flag_url text,
  group_name text NOT NULL,
  fifa_code char(3) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid REFERENCES public.teams(id),
  away_team_id uuid REFERENCES public.teams(id),
  match_date timestamptz NOT NULL,
  stage match_stage NOT NULL,
  group_name text,
  home_score integer,
  away_score integer,
  status match_status NOT NULL DEFAULT 'scheduled',
  match_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_date ON public.matches(match_date);
CREATE INDEX idx_matches_stage ON public.matches(stage);

-- Match events (goals, penalties, etc.)
CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  type event_type NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  player_name text,
  minute integer,
  is_first_goal boolean NOT NULL DEFAULT false,
  is_own_goal boolean NOT NULL DEFAULT false,
  penalty_scored boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_events_match ON public.match_events(match_id);

-- Leagues
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text from 1 for 8)),
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- League members
CREATE TABLE public.league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role league_member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Points config (configurable by admin)
CREATE TABLE public.points_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  points integer NOT NULL,
  description text
);

INSERT INTO public.points_config (category, points, description) VALUES
  ('exact_score', 3, 'Marcador exacto correcto'),
  ('correct_winner', 1, 'Ganador/empate correcto (marcador incorrecto)'),
  ('first_team_to_score', 1, 'Primer equipo en marcar correcto'),
  ('first_goal_scorer', 3, 'Primer goleador correcto'),
  ('has_penalty', 1, 'Predicción de penal (Sí/No) correcta'),
  ('home_goals_exact', 1, 'Goles del local exactos'),
  ('away_goals_exact', 1, 'Goles del visitante exactos'),
  ('bracket_group_first', 3, 'Equipo que queda 1° en su grupo'),
  ('bracket_group_second', 3, 'Equipo que queda 2° en su grupo'),
  ('bracket_round_of_32', 2, 'Ganador de partido en Round of 32'),
  ('bracket_round_of_16', 4, 'Ganador de partido en Round of 16'),
  ('bracket_quarter_final', 6, 'Ganador de partido en Cuartos'),
  ('bracket_semi_final', 8, 'Ganador de partido en Semis'),
  ('bracket_final', 10, 'Ganador del torneo');

-- Bracket predictions (Modo 1)
CREATE TABLE public.bracket_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  predictions jsonb NOT NULL DEFAULT '{}',
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id)
);

-- Bracket points (Modo 1)
CREATE TABLE public.bracket_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id)
);

-- Match predictions (Modo 2)
CREATE TABLE public.match_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  home_goals integer NOT NULL,
  away_goals integer NOT NULL,
  first_team_to_score uuid REFERENCES public.teams(id),
  first_goal_scorer text,
  has_penalty boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  UNIQUE(user_id, match_id, league_id)
);

CREATE INDEX idx_match_predictions_match ON public.match_predictions(match_id);
CREATE INDEX idx_match_predictions_user ON public.match_predictions(user_id);

-- Match points (Modo 2)
CREATE TABLE public.match_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.match_predictions(id) ON DELETE CASCADE UNIQUE,
  base_points integer NOT NULL DEFAULT 0,
  bonus_points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}',
  calculated_at timestamptz NOT NULL DEFAULT now()
);

-- Leaderboard views
CREATE VIEW public.leaderboard_jornada AS
SELECT
  mp.user_id,
  mp.league_id,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  COALESCE(SUM(pts.total_points), 0)::integer AS total_points
FROM public.match_predictions mp
JOIN public.users u ON u.id = mp.user_id
LEFT JOIN public.match_points pts ON pts.prediction_id = mp.id
GROUP BY mp.user_id, mp.league_id, u.name, u.avatar_url;

CREATE VIEW public.leaderboard_bracket AS
SELECT
  bp.user_id,
  bp.league_id,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  bp.total_points
FROM public.bracket_points bp
JOIN public.users u ON u.id = bp.user_id;

CREATE VIEW public.leaderboard_total AS
SELECT
  u.id AS user_id,
  lm.league_id,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  COALESCE(jornada.total_points, 0) + COALESCE(bracket.total_points, 0) AS combined_points
FROM public.users u
LEFT JOIN public.league_members lm ON lm.user_id = u.id
LEFT JOIN public.leaderboard_jornada jornada
  ON jornada.user_id = u.id AND jornada.league_id IS NOT DISTINCT FROM lm.league_id
LEFT JOIN public.leaderboard_bracket bracket
  ON bracket.user_id = u.id AND bracket.league_id IS NOT DISTINCT FROM lm.league_id;

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate match points after result update
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
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF v_match.status != 'finished' THEN RETURN; END IF;

  -- Build points config map
  SELECT jsonb_object_agg(category, points) INTO v_cfg FROM public.points_config;

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
    IF v_pred.home_goals = v_match.home_score AND v_pred.away_goals = v_match.away_score THEN
      v_base := (v_cfg->>'exact_score')::integer;
      v_breakdown := v_breakdown || '{"exact_score": true}';
    -- Base points: correct winner/draw
    ELSIF (v_pred.home_goals > v_pred.away_goals AND v_match.home_score > v_match.away_score)
       OR (v_pred.home_goals < v_pred.away_goals AND v_match.home_score < v_match.away_score)
       OR (v_pred.home_goals = v_pred.away_goals AND v_match.home_score = v_match.away_score) THEN
      v_base := (v_cfg->>'correct_winner')::integer;
      v_breakdown := v_breakdown || '{"correct_winner": true}';
    END IF;

    -- Bonus: home goals exact
    IF v_pred.home_goals = v_match.home_score THEN
      v_bonus := v_bonus + (v_cfg->>'home_goals_exact')::integer;
      v_breakdown := v_breakdown || '{"home_goals_exact": true}';
    END IF;

    -- Bonus: away goals exact
    IF v_pred.away_goals = v_match.away_score THEN
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

-- Trigger: recalculate points when match status becomes 'finished'
CREATE OR REPLACE FUNCTION public.trigger_calculate_match_points()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'finished' AND (OLD.status != 'finished' OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score) THEN
    PERFORM public.calculate_match_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_result_updated
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_match_points();

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_config ENABLE ROW LEVEL SECURITY;

-- Public read for static data
CREATE POLICY "teams are public" ON public.teams FOR SELECT USING (true);
CREATE POLICY "matches are public" ON public.matches FOR SELECT USING (true);
CREATE POLICY "match_events are public" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "points_config is public" ON public.points_config FOR SELECT USING (true);

-- Users can read all profiles, edit only their own
CREATE POLICY "users are public" ON public.users FOR SELECT USING (true);
CREATE POLICY "users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Leagues
CREATE POLICY "leagues are public" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "authenticated users can create leagues" ON public.leagues FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "league owners can update" ON public.leagues FOR UPDATE
  USING (auth.uid() = created_by);

-- League members
CREATE POLICY "league members are public" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "users can join leagues" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can leave leagues" ON public.league_members FOR DELETE USING (auth.uid() = user_id);

-- Bracket predictions
CREATE POLICY "bracket predictions are public" ON public.bracket_predictions FOR SELECT USING (true);
CREATE POLICY "users can manage own bracket predictions" ON public.bracket_predictions
  FOR ALL USING (auth.uid() = user_id);

-- Bracket points
CREATE POLICY "bracket points are public" ON public.bracket_points FOR SELECT USING (true);

-- Match predictions
CREATE POLICY "match predictions are public" ON public.match_predictions FOR SELECT USING (true);
CREATE POLICY "users can manage own match predictions" ON public.match_predictions
  FOR ALL USING (auth.uid() = user_id);

-- Match points
CREATE POLICY "match points are public" ON public.match_points FOR SELECT USING (true);

-- Admin policies for mutations on matches/events/points_config
CREATE POLICY "admins can manage teams" ON public.teams FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admins can manage matches" ON public.matches FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admins can manage match events" ON public.match_events FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admins can manage points config" ON public.points_config FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "admins can manage bracket points" ON public.bracket_points FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
