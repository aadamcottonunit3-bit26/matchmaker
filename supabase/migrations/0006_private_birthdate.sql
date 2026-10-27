-- =====================================================================
-- 0006 PRIVATE DATE OF BIRTH  (Step 1b, phase A)
-- Other members must only ever see an AGE, never the exact date of birth.
--  * the exact DOB moves to public.profile_birth (owner + admin can read; nobody can write through the API)
--  * public.profiles gets age_years (kept up to date by a trigger and by the daily cron)
-- Nothing is deleted here: profiles.dob stays until phase B (0007), after the new code is deployed.
-- Safe to run twice.
--
-- ORDER:  run 0005 -> run THIS file -> deploy the new code -> run 0007
-- =====================================================================

create table if not exists public.profile_birth (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  dob        date not null check (dob <= current_date - interval '18 years'),
  updated_at timestamptz not null default now()
);
alter table public.profile_birth enable row level security;

drop policy if exists birth_select on public.profile_birth;
create policy birth_select on public.profile_birth for select
  using (profile_id = auth.uid() or public.is_admin());

revoke all on public.profile_birth from anon;
revoke insert, update, delete, truncate, references, trigger on public.profile_birth from authenticated;

alter table public.profiles add column if not exists age_years int;
alter table public.profiles alter column dob drop not null;

-- Copy existing dates of birth (copy only: profiles.dob is untouched)
insert into public.profile_birth (profile_id, dob)
select id, dob from public.profiles where dob is not null
on conflict (profile_id) do nothing;

update public.profiles p
   set age_years = public.calc_age(b.dob)
  from public.profile_birth b
 where b.profile_id = p.id;

-- Keep profiles.age_years in sync whenever a birth date is written
create or replace function public.sync_age_years()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set age_years = public.calc_age(new.dob) where id = new.profile_id;
  return new;
end $$;
revoke execute on function public.sync_age_years() from public, anon, authenticated;
drop trigger if exists birth_sync_age on public.profile_birth;
create trigger birth_sync_age after insert or update of dob on public.profile_birth
  for each row execute function public.sync_age_years();

-- Daily refresh (ages change on birthdays). Called by /api/cron/expire with the service role.
create or replace function public.refresh_ages()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.profiles p
     set age_years = public.calc_age(b.dob)
    from public.profile_birth b
   where b.profile_id = p.id and p.age_years is distinct from public.calc_age(b.dob);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.refresh_ages() from public, anon, authenticated;
grant execute on function public.refresh_ages() to service_role;

-- age_years may only be written by the trigger / server, never by a member
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
       or new.gender    is distinct from old.gender
       or new.dob       is distinct from old.dob) then
    raise exception 'Identity fields are locked after verification';
  end if;
  return new;
end $$;

-- Matching now reads the birth dates from the private table (the function runs as its owner)
create or replace function public.match_candidates(p_limit int default 200)
returns setof public.profiles language sql stable security definer set search_path = public as $$
  with me as (
    select p.*, b.dob as my_dob
      from public.profiles p
      join public.profile_birth b on b.profile_id = p.id
     where p.id = auth.uid() and p.status = 'verified'
  )
  select c.*
    from public.profiles c
    join public.profile_birth cb on cb.profile_id = c.id, me
   where c.id <> me.id
     and c.status = 'verified'
     and c.role = 'member'
     and (c.valid_until is null or c.valid_until > now())
     and c.gender <> me.gender
     and c.marital_status = any (me.pref_marital)
     and (c.city = me.city or c.city = any (me.preferred_cities))
     and public.calc_age(cb.dob) between me.pref_age_min and me.pref_age_max
     and public.calc_age(me.my_dob) between c.pref_age_min and c.pref_age_max
     and me.marital_status = any (c.pref_marital)
   limit p_limit;
$$;
revoke execute on function public.match_candidates(int) from public, anon;
grant execute on function public.match_candidates(int) to authenticated, service_role;

notify pgrst, 'reload schema';
