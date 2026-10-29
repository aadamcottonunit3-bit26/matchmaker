-- =====================================================================
-- 0009 RESTRICT MEMBER PROFILE READS  (stops bulk scraping through the API)
-- After this migration a member can read ONLY their own row in public.profiles through the API.
-- Other members' profiles are served by the website's server code, which returns a limited set of
-- fields (no exact income, no plan / validity / internal columns) and is rate limited.
--
-- RUN ONLY AFTER 0005, 0006, 0008 are applied AND the new application code is deployed and working
-- (the old code reads other members' profiles directly and would show empty pages).
-- Rollback: supabase/rollback/0009_rollback.sql
-- =====================================================================

-- Policies must not depend on reading other members' rows any more
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert
  with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and public.is_active_member()
    and public.is_verified_member(case when user_a = auth.uid() then user_b else user_a end)
  );

drop policy if exists photoreq_insert on public.photo_requests;
create policy photoreq_insert on public.photo_requests for insert
  with check (
    requester_id = auth.uid() and public.is_active_member()
    and public.is_verified_member(owner_id)
  );

-- Members: own row only. (Admins keep full access through the existing profiles_admin_all policy.)
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());

-- The old client-callable matching function is replaced by match_candidates_for() (service role only)
revoke execute on function public.match_candidates(int) from public, anon, authenticated;

notify pgrst, 'reload schema';
