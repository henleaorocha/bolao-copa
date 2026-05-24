ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ DEFAULT NULL;

-- Allow members to update their own onboarded_at
CREATE POLICY "league_members_update_own_onboarded_at"
  ON public.league_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
