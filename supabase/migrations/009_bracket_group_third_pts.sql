INSERT INTO public.points_config (category, points, description)
VALUES ('bracket_group_third', 1, 'Equipo que queda 3° en su grupo (sin importar orden entre terceros)')
ON CONFLICT (category) DO UPDATE SET points = EXCLUDED.points, description = EXCLUDED.description;
