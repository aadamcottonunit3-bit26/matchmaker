-- READ-ONLY diagnostics. Run each block in Supabase -> SQL Editor and keep the results.
-- It changes nothing. It shows what is REALLY configured in your live project.

-- 1) Tables in the public schema: is Row Level Security ON? (every row must say true)
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2) Every policy on public tables and on storage.objects
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

-- 3) What the logged-out role (anon) and logged-in members (authenticated) may do on public tables
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 4) Storage buckets: private? size / type limits?
select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;

-- 5) SECURITY DEFINER functions and who may run them
select p.proname, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute')          as anon_can_run,
       has_function_privilege('authenticated', p.oid, 'execute') as members_can_run
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by p.proname;

-- 6) Admin accounts (there should be only the people you expect)
select id, full_name, role, created_at from public.profiles where role = 'admin';

-- 7) Tampered paths (both must return zero rows)
select id, photo_path from public.profiles
 where photo_path is not null and photo_path <> id::text || '/photo.jpg';
select profile_id from public.profile_private
 where (cnic_front_path is not null and cnic_front_path not like profile_id::text || '/%')
    or (cnic_back_path  is not null and cnic_back_path  not like profile_id::text || '/%')
    or (selfie_path     is not null and selfie_path     not like profile_id::text || '/%');
