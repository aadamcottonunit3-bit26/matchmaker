-- =====================================================================
-- Marriage Bureau Platform - Initial Schema (Supabase / PostgreSQL)
-- Run in Supabase SQL editor or via `supabase db push`
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type gender_t           as enum ('male', 'female');
create type marital_status_t   as enum ('single', 'married', 'divorced', 'widow');
create type profile_status_t   as enum ('pending', 'verified', 'banned', 'expired', 'rejected');
create type user_role_t        as enum ('member', 'admin');
create type payment_method_t   as enum ('jazzcash', 'easypaisa', 'bank_transfer');
create type payment_status_t   as enum ('pending', 'approved', 'rejected');
create type photo_req_status_t as enum ('pending', 'approved', 'rejected');
create type plan_tier_t        as enum ('free', 'verified', 'vip');

-- ---------------------------------------------------------------------
-- HELPER FUNCTIONS (age)
-- ---------------------------------------------------------------------
create or replace function public.calc_age(p_dob date, p_on date default current_date)
returns int language sql immutable as $$
  select extract(year from age(p_on, p_dob))::int;
$$;

-- "28 Years (Turning 29 on next birthday)"
create or replace function public.age_label(p_dob date)
returns text language sql stable as $$
  select public.calc_age(p_dob) || ' Years (Turning ' ||
         (public.calc_age(p_dob) + 1) || ' on next birthday)';
$$;

-- ---------------------------------------------------------------------
-- CMS: PLANS (created before profiles because profiles references it)
-- ---------------------------------------------------------------------
create table public.plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  tier           plan_tier_t not null,
  price_pkr      numeric(10,2) not null check (price_pkr >= 0),
  duration_days  int not null check (duration_days > 0),
  features       jsonb not null default '[]',
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROFILES (non-sensitive, matchmaking data)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                user_role_t not null default 'member',
  status              profile_status_t not null default 'pending',
  is_verified         boolean not null default false,       -- green tick
  verified_at         timestamptz,
  verified_by         uuid references public.profiles(id),

  full_name           text not null,
  gender              gender_t not null,
  marital_status      marital_status_t not null,
  dob                 date not null check (dob <= current_date - interval '18 years'),
  city                text not null,
  preferred_cities    text[] not null default '{}',

  -- Tier 2 scoring attributes
  education           text,           -- e.g. matric, intermediate, bachelors, masters, phd
  profession          text,
  monthly_income_pkr  numeric(12,2),
  family_background   text,           -- e.g. upper, upper_middle, middle, lower_middle
  lifestyle           jsonb not null default '{}',  -- {"smoking":"no","prayer":"regular","diet":"halal"}
  about               text,

  -- Partner preferences (Tier 1 + Tier 2)
  pref_age_min        int not null default 18 check (pref_age_min >= 18),
  pref_age_max        int not null default 60,
  pref_marital        marital_status_t[] not null default '{single}',
  pref_education      text,
  pref_profession     text,
  pref_income_min_pkr numeric(12,2),
  pref_family         text,
  pref_lifestyle      jsonb not null default '{}',

  -- Photo privacy
  photo_path          text,                         -- path in private 'profile-photos' bucket
  blur_photo          boolean not null default false,

  -- Subscription
  plan_id             uuid references public.plans(id),
  valid_until         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint pref_age_range_ok check (pref_age_max >= pref_age_min)
);

create index profiles_status_idx   on public.profiles(status);
create index profiles_match_idx    on public.profiles(gender, marital_status, city) where status = 'verified';
create index profiles_valid_idx    on public.profiles(valid_until);

-- ---------------------------------------------------------------------
-- PROFILE_PRIVATE (CNIC etc. - owner + admin only, NEVER other members)
-- ---------------------------------------------------------------------
create table public.profile_private (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  cnic_number     text not null unique,
  cnic_front_path text,    -- private bucket 'cnic-documents'
  cnic_back_path  text,
  phone           text,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PHOTO REQUESTS
-- ---------------------------------------------------------------------
create table public.photo_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  status        photo_req_status_t not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (requester_id, owner_id),
  check (requester_id <> owner_id)
);

-- ---------------------------------------------------------------------
-- ACTIVITY TRACKING (who viewed whom)
-- ---------------------------------------------------------------------
create table public.profile_views (
  id          bigint generated always as identity primary key,
  viewer_id   uuid not null references public.profiles(id) on delete cascade,
  viewed_id   uuid not null references public.profiles(id) on delete cascade,
  ip_address  inet,
  user_agent  text,
  device      text,
  viewed_at   timestamptz not null default now()
);
create index profile_views_viewed_idx on public.profile_views(viewed_id, viewed_at desc);
create index profile_views_viewer_idx on public.profile_views(viewer_id, viewed_at desc);

-- ---------------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (user_a < user_b),               -- canonical ordering prevents duplicates
  unique (user_a, user_b)
);

create table public.messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  body             text not null check (length(body) between 1 and 4000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- MODERATION: BAN LOG (reason is mandatory)
-- ---------------------------------------------------------------------
create table public.moderation_log (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  admin_id    uuid not null references public.profiles(id),
  action      text not null check (action in ('ban','unban','reject','verify')),
  reason      text not null check (length(trim(reason)) >= 5),
  created_at  timestamptz not null default now()
);

-- Generic admin audit trail (e.g. admin read a chat, approved payment)
create table public.admin_audit_logs (
  id          bigint generated always as identity primary key,
  admin_id    uuid not null references public.profiles(id),
  action      text not null,
  target_type text,
  target_id   text,
  meta        jsonb not null default '{}',
  ip_address  inet,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PAYMENTS (manual approval queue)
-- ---------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  plan_id       uuid not null references public.plans(id),
  method        payment_method_t not null,
  amount_pkr    numeric(10,2) not null check (amount_pkr > 0),
  transaction_ref text,
  receipt_path  text not null,                 -- private bucket 'payment-receipts'
  status        payment_status_t not null default 'pending',
  admin_note    text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index payments_status_idx on public.payments(status, created_at);

-- ---------------------------------------------------------------------
-- CMS: SLIDERS, PAGES, SETTINGS
-- ---------------------------------------------------------------------
create table public.cms_sliders (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  subtitle    text,
  image_path  text not null,                   -- public 'cms-media' bucket
  link_url    text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.cms_pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- about-us, terms, privacy-policy
  title       text not null,
  content_md  text not null default '',
  is_published boolean not null default true,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.cms_pages (slug, title) values
  ('about-us', 'About Us'),
  ('terms-and-conditions', 'Terms & Conditions'),
  ('privacy-policy', 'Privacy Policy');

-- ---------------------------------------------------------------------
-- UTILITY: is_admin(), is_active_member(), updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'verified'
      and (valid_until is null or valid_until > now())
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Block members from escalating their own role / status / verification / plan
-- NOTE: deliberately SECURITY INVOKER. As a definer function current_user would always be the
-- function owner (postgres) and the check below would never block anyone.
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
  or new.valid_until is distinct from old.valid_until then
    raise exception 'Not allowed to modify protected profile fields';
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- ADMIN RPCs (security definer; all check is_admin())
-- ---------------------------------------------------------------------
create or replace function public.admin_verify_profile(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  -- Verification starts the membership clock on the Free plan unless a paid plan is already active.
  update public.profiles p
     set status = 'verified', is_verified = true,
         verified_at = now(), verified_by = auth.uid(),
         plan_id = coalesce(p.plan_id, (select id from public.plans where tier = 'free' and is_active order by sort_order limit 1)),
         valid_until = coalesce(p.valid_until,
           now() + make_interval(days => coalesce((select duration_days from public.plans where tier = 'free' and is_active order by sort_order limit 1), 365)))
   where p.id = p_profile;
  insert into public.moderation_log(profile_id, admin_id, action, reason)
  values (p_profile, auth.uid(), 'verify', 'CNIC and photo manually verified');
end $$;

create or replace function public.admin_ban_profile(p_profile uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A ban reason (min 5 chars) is mandatory';
  end if;
  update public.profiles set status = 'banned' where id = p_profile;
  insert into public.moderation_log(profile_id, admin_id, action, reason)
  values (p_profile, auth.uid(), 'ban', p_reason);
end $$;

create or replace function public.admin_unban_profile(p_profile uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_valid timestamptz;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'An unban reason is mandatory';
  end if;
  select valid_until into v_valid from public.profiles where id = p_profile;
  update public.profiles
     set status = case when v_valid is not null and v_valid < now() then 'expired'::profile_status_t
                       when is_verified then 'verified'::profile_status_t
                       else 'pending'::profile_status_t end
   where id = p_profile;
  insert into public.moderation_log(profile_id, admin_id, action, reason)
  values (p_profile, auth.uid(), 'unban', p_reason);
end $$;

create or replace function public.admin_review_payment(p_payment uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_pay public.payments; v_plan public.plans; v_base timestamptz;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into v_pay from public.payments where id = p_payment and status = 'pending' for update;
  if not found then raise exception 'payment not found or already reviewed'; end if;

  update public.payments
     set status = case when p_approve then 'approved'::payment_status_t else 'rejected'::payment_status_t end,
         admin_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_payment;

  if p_approve then
    select * into v_plan from public.plans where id = v_pay.plan_id;
    select greatest(coalesce(valid_until, now()), now()) into v_base
      from public.profiles where id = v_pay.user_id;
    update public.profiles
       set plan_id = v_plan.id,
           valid_until = v_base + make_interval(days => v_plan.duration_days),
           status = case when status = 'expired' then 'verified'::profile_status_t else status end
     where id = v_pay.user_id;
  end if;

  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, meta)
  values (auth.uid(), case when p_approve then 'payment_approved' else 'payment_rejected' end,
          'payment', p_payment::text, jsonb_build_object('note', p_note));
end $$;

-- Run daily (pg_cron or a Vercel Cron -> API route using service role)
create or replace function public.expire_profiles()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.profiles set status = 'expired'
   where status = 'verified' and valid_until is not null and valid_until < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.expire_profiles() from public, anon, authenticated;
grant execute on function public.expire_profiles() to service_role;

-- ---------------------------------------------------------------------
-- TIER 1 MATCHING: hard filters (returns candidate rows; scoring is in app code)
--   * opposite gender
--   * candidate marital status is in my preferences
--   * candidate city is my city or one of my preferred cities
--   * candidate age within MY range AND my age within THEIR range (mutual)
-- ---------------------------------------------------------------------
create or replace function public.match_candidates(p_limit int default 200)
returns setof public.profiles language sql stable security definer set search_path = public as $$
  with me as (select * from public.profiles where id = auth.uid() and status = 'verified')
  select c.*
    from public.profiles c, me
   where c.id <> me.id
     and c.status = 'verified'
     and c.role = 'member'
     and (c.valid_until is null or c.valid_until > now())
     and c.gender <> me.gender
     and c.marital_status = any (me.pref_marital)
     and (c.city = me.city or c.city = any (me.preferred_cities))
     and public.calc_age(c.dob) between me.pref_age_min and me.pref_age_max
     and public.calc_age(me.dob) between c.pref_age_min and c.pref_age_max
     and me.marital_status = any (c.pref_marital)
   limit p_limit;
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.profile_private  enable row level security;
alter table public.photo_requests   enable row level security;
alter table public.profile_views    enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.moderation_log   enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.payments         enable row level security;
alter table public.plans            enable row level security;
alter table public.cms_sliders      enable row level security;
alter table public.cms_pages        enable row level security;

-- PROFILES
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_admin()
  or (status = 'verified' and role = 'member' and public.is_active_member())
);
create policy profiles_insert_own on public.profiles for insert
  with check (id = auth.uid() and role = 'member' and status = 'pending' and is_verified = false);
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- PROFILE_PRIVATE: owner + admin only. No member can ever read another's CNIC.
create policy private_select on public.profile_private for select
  using (profile_id = auth.uid() or public.is_admin());
create policy private_insert on public.profile_private for insert
  with check (profile_id = auth.uid());
create policy private_update on public.profile_private for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- PHOTO REQUESTS
create policy photoreq_select on public.photo_requests for select
  using (requester_id = auth.uid() or owner_id = auth.uid() or public.is_admin());
create policy photoreq_insert on public.photo_requests for insert
  with check (requester_id = auth.uid() and public.is_active_member());
create policy photoreq_owner_respond on public.photo_requests for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- PROFILE VIEWS (inserted by server with service role; viewers may not read others' logs)
create policy views_select on public.profile_views for select
  using (public.is_admin() or viewed_id = auth.uid());

-- CONVERSATIONS / MESSAGES (participants + READ-ONLY admin)
create policy conv_select on public.conversations for select
  using (user_a = auth.uid() or user_b = auth.uid() or public.is_admin());
create policy conv_insert on public.conversations for insert
  with check ((user_a = auth.uid() or user_b = auth.uid()) and public.is_active_member());

create policy msg_select on public.messages for select using (
  public.is_admin() or exists (
    select 1 from public.conversations c
     where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy msg_insert on public.messages for insert with check (
  sender_id = auth.uid() and public.is_active_member() and exists (
    select 1 from public.conversations c
     where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
-- no UPDATE/DELETE policies for admin on messages => monitoring is strictly read-only

-- MODERATION / AUDIT (admin only)
create policy modlog_admin on public.moderation_log for select using (public.is_admin());
create policy audit_admin  on public.admin_audit_logs for select using (public.is_admin());

-- PAYMENTS
create policy pay_select on public.payments for select
  using (user_id = auth.uid() or public.is_admin());
create policy pay_insert on public.payments for insert
  with check (user_id = auth.uid() and status = 'pending');

-- CMS (public read, admin write)
create policy plans_read    on public.plans        for select using (is_active or public.is_admin());
create policy plans_admin   on public.plans        for all using (public.is_admin()) with check (public.is_admin());
create policy sliders_read  on public.cms_sliders  for select using (is_active or public.is_admin());
create policy sliders_admin on public.cms_sliders  for all using (public.is_admin()) with check (public.is_admin());
create policy pages_read    on public.cms_pages    for select using (is_published or public.is_admin());
create policy pages_admin   on public.cms_pages    for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- STORAGE BUCKETS (all private except cms-media)
-- Object path convention: <user_id>/<filename>
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('cnic-documents',   'cnic-documents',   false),
  ('payment-receipts', 'payment-receipts', false),
  ('profile-photos',   'profile-photos',   false),
  ('cms-media',        'cms-media',        true)
on conflict (id) do nothing;

-- CNIC: owner can upload/read own folder, admin can read all. Nobody else.
create policy cnic_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cnic-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cnic_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'cnic-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Receipts: same pattern
create policy receipt_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy receipt_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Photos: owner uploads/reads own. Other members NEVER read directly;
-- the Next.js API route (service role) checks blur_photo + approved photo_request,
-- then returns a short-lived signed URL (or a blurred render).
create policy photo_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photo_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- CMS media: admin write only (public bucket serves reads)
create policy cms_media_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'cms-media' and public.is_admin())
  with check (bucket_id = 'cms-media' and public.is_admin());

-- =====================================================================
-- SEED: default plans (editable from admin CMS afterwards)
-- =====================================================================
insert into public.plans (name, tier, price_pkr, duration_days, features, sort_order) values
  ('Free',     'free',     0,    365, '["Create profile","Limited browsing"]', 0),
  ('Verified', 'verified', 2000, 90,  '["Green verified tick","Full browsing","Messaging"]', 1),
  ('VIP',      'vip',      5000, 180, '["Everything in Verified","Priority listing","Photo request priority"]', 2);

-- To create the first admin: sign up normally, then run (as postgres):
--   update public.profiles set role = 'admin', status = 'verified', is_verified = true where id = '<your-auth-uid>';
