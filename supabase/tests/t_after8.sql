-- State: 0001..0006 + 0008 applied.
select test.run('AFTER 0008','member A cannot call rate_limit_hit()','authenticated','00000000-0000-0000-0000-00000000000a',$q$select public.rate_limit_hit('x',1,60)$q$,'fail');
select test.run('AFTER 0008','logged-out visitor cannot call rate_limit_hit()','anon',null,$q$select public.rate_limit_hit('x',1,60)$q$,'fail');
select test.run('AFTER 0008','service role can call rate_limit_hit()','service_role',null,$q$select public.rate_limit_hit('x',1,60)$q$,'ok');
select test.run('AFTER 0008','member A cannot read the rate_limits table','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 from public.rate_limits$q$,'fail');
select test.run('AFTER 0008','member A cannot write the rate_limits table','authenticated','00000000-0000-0000-0000-00000000000a',$q$delete from public.rate_limits$q$,'fail');
select test.run('AFTER 0008','member A cannot call match_candidates_for() for someone else','authenticated','00000000-0000-0000-0000-00000000000a',$q$select * from public.match_candidates_for('00000000-0000-0000-0000-00000000000b')$q$,'fail');
select test.run('AFTER 0008','logged-out visitor cannot call match_candidates_for()','anon',null,$q$select * from public.match_candidates_for('00000000-0000-0000-0000-00000000000a')$q$,'fail');
select test.run('AFTER 0008','service role: matching for A returns B only','service_role',null,$q$select * from public.match_candidates_for('00000000-0000-0000-0000-00000000000a')$q$,'count=1');
select test.run('AFTER 0008','service role: pending member C gets no matches (not verified)','service_role',null,$q$select * from public.match_candidates_for('00000000-0000-0000-0000-00000000000c')$q$,'count=0');
select test.run('AFTER 0008','is_verified_member: B yes','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 where public.is_verified_member('00000000-0000-0000-0000-00000000000b')$q$,'count=1');
select test.run('AFTER 0008','is_verified_member: pending C no','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 where public.is_verified_member('00000000-0000-0000-0000-00000000000c')$q$,'count=0');
select test.run('AFTER 0008','is_verified_member: admin no','authenticated','00000000-0000-0000-0000-00000000000a',$q$select 1 where public.is_verified_member('00000000-0000-0000-0000-0000000000ad')$q$,'count=0');
select test.report('AFTER 0008');
