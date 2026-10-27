-- =====================================================================
-- 0007 DROP profiles.dob  (Step 1b, phase B)
-- Run ONLY AFTER 0005 + 0006 are done AND the new application code is deployed and working.
-- The dates of birth are kept in public.profile_birth (copied by 0006). Rollback: supabase/rollback/0007_rollback.sql
-- =====================================================================

-- Self-heal: anyone who registered with the OLD code between 0006 and the deploy
insert into public.profile_birth (profile_id, dob)
select id, dob from public.profiles where dob is not null
on conflict (profile_id) do nothing;

update public.profiles p
   set age_years = public.calc_age(b.dob)
  from public.profile_birth b
 where b.profile_id = p.id and p.age_years is distinct from public.calc_age(b.dob);

-- Safety stop: refuse to drop the column if any profile would lose its date of birth
do $$
begin
  if exists (select 1 from public.profiles p
              left join public.profile_birth b on b.profile_id = p.id
             where b.profile_id is null) then
    raise exception 'Aborted: some profiles have no row in profile_birth. Nothing was changed.';
  end if;
end $$;

-- The trigger function must no longer mention dob (the identity freeze for dob is now structural:
-- profile_birth cannot be written through the API at all)
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
  or new.reg_no      is distinct from old.reg_no
  or new.age_years   is distinct from old.age_years then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  if new.photo_path is distinct from old.photo_path
     and new.photo_path is distinct from (old.id::text || '/photo.jpg') then
    raise exception 'Invalid photo path';
  end if;
  if old.is_verified
     and (new.full_name is distinct from old.full_name
       or new.gender    is distinct from old.gender) then
    raise exception 'Identity fields are locked after verification';
  end if;
  return new;
end $$;

alter table public.profiles drop column dob;

notify pgrst, 'reload schema';
