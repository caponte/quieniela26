-- Remove the two wrong entries and insert the correct single player
DELETE FROM public.players
WHERE team_id = (SELECT id FROM public.teams WHERE fifa_code = 'IRN')
  AND name IN ('Ali Nemati', 'Omid Noorafkan');

INSERT INTO public.players (team_id, name, position, jersey_number)
SELECT id, 'Ali Nemati Omid Noorafkan', 'DEF', 10
FROM public.teams WHERE fifa_code = 'IRN';

-- Renumber #11 Ramin Rezaeian to fill the gap (now he stays at 11 which is fine)
