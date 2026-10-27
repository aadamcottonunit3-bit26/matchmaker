-- State: 0001..0006 applied (old profiles.dob column still exists until 0007).
select test.run('AFTER 0006','profile_birth holds a row for every profile','authenticated','00000000-0000-0000-0000-0000000000ad',$q$select 1 from public.profile_birth$q$,'count=4');
select test.run('AFTER 0006','member A reads OWN date of birth','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 from public.profile_birth where profile_id='00000000-0000-0000-0000-00000000000a'$q$,'count=1');
select test.run('AFTER 0006','member A reads B''s date of birth','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 from public.profile_birth where profile_id='00000000-0000-0000-0000-00000000000b'$q$,'count=0');
select test.run('AFTER 0006','logged-out visitor reads profile_birth','anon',null,$q$select 1 from public.profile_birth$q$,'fail');
select test.run('AFTER 0006','ADMIN reads everyone''s date of birth','authenticated','00000000-0000-0000-0000-0000000000ad',$q$select 1 from public.profile_birth where profile_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c')$q$,'count=3');
select test.run('AFTER 0006','member A changes own date of birth through the API','authenticated','00000000-0000-0000-0000-00000000000a',$q$update public.profile_birth set dob=date '1970-01-01' where profile_id='00000000-0000-0000-0000-00000000000a'$q$,'fail');
select test.run('AFTER 0006','member A inserts a profile_birth row','authenticated','00000000-0000-0000-0000-00000000000a',$q$insert into public.profile_birth(profile_id,dob) values ('00000000-0000-0000-0000-00000000000c',date '1990-01-01')$q$,'fail');
select test.run('AFTER 0006','member A fakes own age_years','authenticated','00000000-0000-0000-0000-00000000000a',$q$update public.profiles set age_years=20 where id='00000000-0000-0000-0000-00000000000a'$q$,'fail');
select test.run('AFTER 0006','member A cannot run refresh_ages()','authenticated','00000000-0000-0000-0000-00000000000a',$q$select public.refresh_ages()$q$,'fail');
select test.run('AFTER 0006','service role can run refresh_ages() (daily cron)','service_role',null,$q$select public.refresh_ages()$q$,'ok');
select test.run('AFTER 0006','age_years was filled for every profile','authenticated','00000000-0000-0000-0000-0000000000ad',$q$select 1 from public.profiles where age_years is null$q$,'count=0');
select test.run('AFTER 0006','matching works with the private birth table (A sees B)','authenticated','00000000-0000-0000-0000-00000000000a',$q$select * from public.match_candidates()$q$,'count=1');
select test.run('AFTER 0006','new profile edits still work for verified member A','authenticated','00000000-0000-0000-0000-00000000000a',$q$update public.profiles set about='Updated again' where id='00000000-0000-0000-0000-00000000000a'$q$,'ok');
select test.report('AFTER 0006');
