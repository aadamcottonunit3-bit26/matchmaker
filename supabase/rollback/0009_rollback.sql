-- Rollback for 0009: members can read all verified members' profile rows through the API again.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_admin()
  or (public.is_active_member() and status = 'verified' and role = 'member')
);
grant execute on function public.match_candidates(int) to authenticated, service_role;
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert with check (
  (user_a = auth.uid() or user_b = auth.uid()) and public.is_active_member()
  and exists (select 1 from public.profiles o
               where o.id = case when user_a = auth.uid() then user_b else user_a end
                 and o.status = 'verified' and o.role = 'member'));
drop policy if exists photoreq_insert on public.photo_requests;
create policy photoreq_insert on public.photo_requests for insert with check (
  requester_id = auth.uid() and public.is_active_member()
  and exists (select 1 from public.profiles o where o.id = owner_id and o.status = 'verified' and o.role = 'member'));
notify pgrst, 'reload schema';
