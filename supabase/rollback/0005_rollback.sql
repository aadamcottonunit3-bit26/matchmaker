-- Rollback for 0005_security_hardening.sql (restores the ORIGINAL 0001 behaviour).
-- Only use this if 0005 broke something and you need the old behaviour back quickly.
drop policy if exists private_admin_select on public.profile_private;
create policy private_select on public.profile_private for select using (profile_id = auth.uid() or public.is_admin());
create policy private_insert on public.profile_private for insert with check (profile_id = auth.uid());
create policy private_update on public.profile_private for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
grant insert, update on public.profile_private to authenticated;

create policy profiles_insert_own on public.profiles for insert
  with check (id = auth.uid() and role = 'member' and status = 'pending' and is_verified = false);
grant insert on public.profiles to authenticated;

drop trigger if exists photoreq_protect on public.photo_requests;
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert
  with check ((user_a = auth.uid() or user_b = auth.uid()) and public.is_active_member());
drop policy if exists photoreq_insert on public.photo_requests;
create policy photoreq_insert on public.photo_requests for insert
  with check (requester_id = auth.uid() and public.is_active_member());

drop policy if exists cnic_admin_read on storage.objects;
create policy cnic_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cnic-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cnic_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'cnic-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy receipt_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photo_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
update storage.buckets set file_size_limit = null, allowed_mime_types = null
 where id in ('cnic-documents','payment-receipts','profile-photos','cms-media');

grant execute on function public.admin_verify_profile(uuid), public.admin_ban_profile(uuid, text),
  public.admin_unban_profile(uuid, text), public.admin_review_payment(uuid, boolean, text),
  public.match_candidates(int) to anon;
-- (the protect_profile_columns() trigger function: re-run its definition from 0002 to restore it)
notify pgrst, 'reload schema';
