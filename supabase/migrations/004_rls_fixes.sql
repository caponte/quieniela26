-- Fix 1: league owners can delete their own leagues
-- Was missing — deleteLeague silently deleted 0 rows and redirected without effect
CREATE POLICY "league owners can delete" ON public.leagues
  FOR DELETE USING (auth.uid() = created_by);

-- Fix 2: allow league owners to kick members
-- Original policy only allowed users to delete their own membership,
-- blocking kickMember (owner deletes another user's row)
DROP POLICY "users can leave leagues" ON public.league_members;
CREATE POLICY "users can leave or be kicked" ON public.league_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT created_by FROM public.leagues WHERE id = league_id)
  );
