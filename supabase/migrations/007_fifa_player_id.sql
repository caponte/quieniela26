ALTER TABLE players ADD COLUMN IF NOT EXISTS fifa_player_id text;
CREATE INDEX IF NOT EXISTS idx_players_fifa_player_id ON players(fifa_player_id);
