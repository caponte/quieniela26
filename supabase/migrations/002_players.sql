-- Players table for first goal scorer predictions
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
  jersey_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_team ON public.players(team_id);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players readable by all" ON public.players FOR SELECT USING (true);

-- Add FK for first goal scorer on match_predictions
-- (first_goal_scorer text already exists from 001; this adds the uuid FK alongside it)
ALTER TABLE public.match_predictions
  ADD COLUMN first_goal_scorer_id uuid REFERENCES public.players(id) ON DELETE SET NULL;
