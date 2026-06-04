SELECT p.jersey_number, p.name, p.position FROM public.players p JOIN public.teams t ON t.id = p.team_id WHERE t.fifa_code = 'MEX' ORDER BY p.jersey_number;
