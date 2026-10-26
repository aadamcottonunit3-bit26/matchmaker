-- =====================================================================
-- 0002 UPGRADE  (run ONCE in Supabase -> SQL Editor, BEFORE deploying the new code)
-- Adds: registration numbers, height / sect / marriage timeline, CNIC selfie,
--       profile reports, shortlists.
-- Safe to run twice (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

-- 1) Registration number (RB-2026-0001 ...)
create sequence if not exists public.profile_reg_seq start 1;
grant usage, select on sequence public.profile_reg_seq to anon, authenticated, service_role;

alter table public.profiles
  add column if not exists reg_no text unique
    default ('RB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.profile_reg_seq')::text, 4, '0'));

-- 2) Extra optional profile details
alter table public.profiles
  add column if not exists height_cm int check (height_cm is null or height_cm between 120 and 230),
  add column if not exists sect text check (sect is null or sect in ('sunni','shia','other')),
  add column if not exists marriage_timeline text
    check (marriage_timeline is null or marriage_timeline in ('asap','within_6_months','within_1_year','no_hurry'));

-- 3) Selfie holding CNIC (stored in the private 'cnic-documents' bucket)
alter table public.profile_private add column if not exists selfie_path text;

-- 4) Reports (members report a profile, admins resolve)
create table if not exists public.profile_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reported_id  uuid not null references public.profiles(id) on delete cascade,
  reason       text not null check (reason in ('fake_profile','abusive','scam','inappropriate_photo','other')),
  details      text check (details is null or length(details) <= 1000),
  status       text not null default 'open' check (status in ('open','resolved')),
  resolved_by  uuid references public.profiles(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (reporter_id, reported_id),
  check (reporter_id <> reported_id)
);
create index if not exists profile_reports_status_idx on public.profile_reports(status, created_at);
alter table public.profile_reports enable row level security;

drop policy if exists reports_insert on public.profile_reports;
create policy reports_insert on public.profile_reports for insert
  with check (reporter_id = auth.uid() and public.is_active_member());
drop policy if exists reports_select on public.profile_reports;
create policy reports_select on public.profile_reports for select
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists reports_admin_update on public.profile_reports;
create policy reports_admin_update on public.profile_reports for update
  using (public.is_admin()) with check (public.is_admin());

-- 5) Shortlist (saved profiles)
create table if not exists public.shortlists (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, profile_id),
  check (user_id <> profile_id)
);
alter table public.shortlists enable row level security;

drop policy if exists shortlist_select on public.shortlists;
create policy shortlist_select on public.shortlists for select using (user_id = auth.uid());
drop policy if exists shortlist_insert on public.shortlists;
create policy shortlist_insert on public.shortlists for insert
  with check (user_id = auth.uid() and public.is_active_member());
drop policy if exists shortlist_delete on public.shortlists;
create policy shortlist_delete on public.shortlists for delete using (user_id = auth.uid());

-- 6) Members must not be able to change their own registration number
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
  return new;
end $$;
