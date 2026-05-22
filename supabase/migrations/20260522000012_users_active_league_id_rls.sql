-- Migration 12: add active_league_id to users + new RLS policies for leagues

ALTER TABLE public.users
  ADD COLUMN active_league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL;

-- League admin can UPDATE their own league
CREATE POLICY leagues_admin_update ON public.leagues
  FOR UPDATE USING (auth.uid() = created_by);

-- League admin can DELETE their own league
CREATE POLICY leagues_admin_delete ON public.leagues
  FOR DELETE USING (auth.uid() = created_by);

-- Any authenticated user can INSERT a new league where they are the creator
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- League admin can DELETE members from their leagues
CREATE POLICY league_members_admin_delete ON public.league_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = league_members.league_id
        AND created_by = auth.uid()
    )
  );

-- Any authenticated user can INSERT themselves as a member
CREATE POLICY league_members_self_insert ON public.league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
