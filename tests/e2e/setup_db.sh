#!/bin/bash
# Builds the e2e database in its FINAL state (migrations 0001..0009) with synthetic accounts.
M=/home/claude/site/marriage-bureau/supabase/migrations; T=/home/claude/site/marriage-bureau/supabase/tests
cp $M/*.sql /tmp/e2e/ 2>/dev/null; cp $T/shim.sql $T/seed.sql /tmp/e2e/; chmod -R a+rX /tmp/e2e
python3 - <<'EOF'
# PostgREST (v12) exposes the JWT as request.jwt.claims (JSON): make auth.uid() understand both forms
p='/tmp/e2e/shim.sql'; s=open(p).read()
s=s.replace("""$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;""","""$$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                   (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;""")
s+="""
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login password 'pw'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
"""
open(p,'w').write(s)
EOF
q() { su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d e2e -f /tmp/e2e/$1" 2>&1 | grep -E "ERROR" ; }
su postgres -c "psql -X -q -c 'drop database if exists e2e' -c 'create database e2e'" >/dev/null 2>&1
for f in shim.sql 0001_schema.sql 0002_upgrade.sql 0003_personal_details.sql 0004_income_range_and_gallery.sql 0005_security_hardening.sql seed.sql 0006_private_birthdate.sql 0008_rate_limits_and_server_matching.sql 0007_drop_profiles_dob.sql 0009_restrict_member_profile_reads.sql; do
  r=$(q $f); [ -n "$r" ] && echo "[$f] $r"
done
# extra seed: richer profile for A and B so the pages have something to show; admin has a verified CNIC row for B
su postgres -c "psql -X -q -d e2e" <<'SQL'
update public.profiles set monthly_income_pkr = 135000, education='masters', profession='Engineer', about='About A' where id='00000000-0000-0000-0000-00000000000a';
update public.profiles set monthly_income_pkr = 137531, education='bachelors', profession='Teacher', about='About B', blur_photo = true where id='00000000-0000-0000-0000-00000000000b';
SQL
echo "db ready"
