SELECT t.fifa_code, t.name AS team, COUNT(p.id) AS player_count
FROM public.teams t
LEFT JOIN public.players p ON p.team_id = t.id
GROUP BY t.fifa_code, t.name
HAVING COUNT(p.id) > 0
ORDER BY t.fifa_code;
