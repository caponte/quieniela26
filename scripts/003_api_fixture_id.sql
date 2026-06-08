-- Add API-Football fixture ID to matches for automatic sync
ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_fixture_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_matches_api_fixture_id ON matches(api_fixture_id);
