SELECT jersey_number, name, position FROM public.players WHERE team_id = (SELECT id FROM public.teams WHERE fifa_code = 'TUR') ORDER BY jersey_number;
