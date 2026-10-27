-- =====================================================================
-- 0005 SECURITY HARDENING  (Step 1)
-- Safe with BOTH the old and the new application code. Safe to run twice.
-- Run in Supabase -> SQL Editor. Rollback: supabase/rollback/0005_rollback.sql
--
-- What it does
--  1. CNIC data (profile_private) becomes ADMIN-ONLY. Members can no longer read OR write it.
--  2. Members can no longer insert their own profile row (registration is done by the server).
--  3. Members can no longer point photo_path at someone else's file (photo-privacy bypass).
--  4. Name / gender / date of birth are frozen at the database once an admin verified the profile.
--  5. Members can no longer pre-set a plan or validity on payments, and cannot message or
--     photo-request users who are not verified members.
--  6. Storage: CNIC files are readable by admins only; members cannot upload straight into
--     the buckets; buckets accept only JPG/PNG/WebP up to 5 MB.
--  7. Admin RPCs and match_candidates() are no longer callable by logged-out visitors.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CNIC table: admin read only, nobody writes through the API
-- ---------------------------------------------------------------------
drop policy if exists private_select on public.profile_private;
drop policy if exists private_insert on public.profile_private;
drop policy if exists private_update on public.profile_private;
drop policy if exists private_admin_select on public.profile_private;
create policy private_admin_select on public.profile_private for select using (public.is_admin());

revoke all on public.profile_private from anon;
revoke insert, update, delete, truncate, references, trigger on public.profile_private from authenticated;

-- ---------------------------------------------------------------------
-- 2) No self-insert of profile rows (the server creates them with the service role)
-- ---------------------------------------------------------------------
drop policy if exists profiles_insert_own on public.profiles;
revoke insert on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3 + 4) Protected columns, photo path pinning, identity freeze
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or current_user in ('postgres','service_role') then
    return new;
  end if;
  if new.role        is distinct from old.role
  or new.status      is distinct from old.status
  or new.is_verified is distinct from old.is_verified
  or new.verified_at is distinct from old.verified_at
  or new.verified_by is distinct from old.verified_by
  or new.plan_id     is distinct from old.plan_id
  or new.valid_until is distinct from old.valid_until
  or new.reg_no      is distinct from old.reg_no then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  -- The photo path may only ever be the member's OWN file.
  if new.photo_path is distinct from old.photo_path
     and new.photo_path is distinct from (old.id::text || '/photo.jpg') then
    raise exception 'Invalid photo path';
  end if;
  -- Identity fields are frozen once an admin has verified the profile.
  if old.is_verified
     and (new.full_name is distinct from old.full_name
       or new.gender    is distinct from old.gender
       or new.dob       is distinct from old.dob) then
    raise exception 'Identity fields are locked after verification';
  end if;
  return new;
end $$;

-- Repair any photo path that was already pointed at someone else's file
update public.profiles
   set photo_path = id::text || '/photo.jpg'
 where photo_path is not null and photo_path <> id::text || '/photo.jpg';

-- ---------------------------------------------------------------------
-- 5) Payments, conversations, photo requests
-- ---------------------------------------------------------------------
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert
  with check (user_id = auth.uid() and status = 'pending'
              and reviewed_by is null and reviewed_at is null and admin_note is null);

drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert
  with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and public.is_active_member()
    and exists (
      select 1 from public.profiles o
       where o.id = case when user_a = auth.uid() then user_b else user_a end
         and o.status = 'verified' and o.role = 'member')
  );

drop policy if exists photoreq_insert on public.photo_requests;
create policy photoreq_insert on public.photo_requests for insert
  with check (
    requester_id = auth.uid() and public.is_active_member()
    and exists (select 1 from public.profiles o
                 where o.id = owner_id and o.status = 'verified' and o.role = 'member')
  );

-- The owner may answer a request, but not re-assign it to someone else
create or replace function public.protect_photo_request()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_admin() or current_user in ('postgres','service_role') then
    return new;
  end if;
  if new.requester_id is distinct from old.requester_id
  or new.owner_id     is distinct from old.owner_id
  or new.created_at   is distinct from old.created_at then
    raise exception 'Not allowed to modify this photo request';
  end if;
  return new;
end $$;
drop trigger if exists photoreq_protect on public.photo_requests;
create trigger photoreq_protect before update on public.photo_requests
  for each row execute function public.protect_photo_request();

-- ---------------------------------------------------------------------
-- 6) Storage
-- ---------------------------------------------------------------------
-- CNIC documents: admin read only. (All uploads are done by the server with the service role.)
drop policy if exists cnic_owner_insert on storage.objects;
drop policy if exists cnic_owner_read   on storage.objects;
drop policy if exists cnic_admin_read   on storage.objects;
create policy cnic_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'cnic-documents' and public.is_admin());

-- Members cannot upload straight into receipts / photos either (server validates and uploads)
drop policy if exists receipt_owner_insert on storage.objects;
drop policy if exists photo_owner_insert   on storage.objects;

-- Only small images are accepted by the buckets themselves
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id in ('cnic-documents','payment-receipts','profile-photos','cms-media');

-- ---------------------------------------------------------------------
-- 7) Function privileges (keep is_admin / is_active_member callable: RLS policies need them)
-- ---------------------------------------------------------------------
revoke execute on function public.admin_verify_profile(uuid)               from public, anon;
revoke execute on function public.admin_ban_profile(uuid, text)            from public, anon;
revoke execute on function public.admin_unban_profile(uuid, text)          from public, anon;
revoke execute on function public.admin_review_payment(uuid, boolean, text) from public, anon;
revoke execute on function public.match_candidates(int)                    from public, anon;
grant execute on function public.admin_verify_profile(uuid)               to authenticated, service_role;
grant execute on function public.admin_ban_profile(uuid, text)            to authenticated, service_role;
grant execute on function public.admin_unban_profile(uuid, text)          to authenticated, service_role;
grant execute on function public.admin_review_payment(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.match_candidates(int)                    to authenticated, service_role;

notify pgrst, 'reload schema';
