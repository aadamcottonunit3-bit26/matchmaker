-- =====================================================================
-- 0008 RATE LIMITS + SERVER-SIDE MATCHING + HELPERS   (additive, safe to run before the new code)
--  * public.rate_limit_hit()      : reliable rate limiting shared by all serverless instances
--  * public.is_verified_member()  : SECURITY DEFINER helper used by policies (so policies keep working
--                                   after members lose direct read access to other members' rows, see 0009)
--  * public.match_candidates_for(): the matching query for the server (service role) only
-- Nothing is removed or restricted here. Safe to run twice.
-- ORDER: 0005 -> 0006 -> THIS file -> deploy new code -> 0007 -> 0009
-- =====================================================================

-- ---------------------------------------------------------------------
-- Rate limiting (fixed window per key; keys never contain plaintext emails: the server hashes them)
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table public.rate_limits enable row level security;   -- no policies: nobody but the server can touch it
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                    then 1 else r.hits + 1 end,
        window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                            then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant  execute on function public.rate_limit_hit(text, int, int) to service_role;

create or replace function public.purge_rate_limits()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;
grant  execute on function public.purge_rate_limits() to service_role;

-- ---------------------------------------------------------------------
-- Helper for policies: is this id a verified member?
-- ---------------------------------------------------------------------
create or replace function public.is_verified_member(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_id and status = 'verified' and role = 'member');
$$;
revoke execute on function public.is_verified_member(uuid) from public, anon;
grant  execute on function public.is_verified_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Matching for the server (service role). Same rules as match_candidates(), user passed explicitly.
-- ---------------------------------------------------------------------
create or replace function public.match_candidates_for(p_user uuid, p_limit int default 100)
returns setof public.profiles language sql stable security definer set search_path = public as $$
  with me as (
    select p.*, b.dob as my_dob
      from public.profiles p
      join public.profile_birth b on b.profile_id = p.id
     where p.id = p_user and p.status = 'verified'
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
   limit least(greatest(p_limit, 1), 200);
$$;
revoke execute on function public.match_candidates_for(uuid, int) from public, anon, authenticated;
grant  execute on function public.match_candidates_for(uuid, int) to service_role;

notify pgrst, 'reload schema';
