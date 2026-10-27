-- (1) Trigger: writing a birth date must set profiles.age_years by itself
do $$
declare v_age int; v_id uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (v_id);
  insert into public.profiles(id, full_name, gender, marital_status, city) values (v_id,'Trigger Test','male','single','X');
  insert into public.profile_birth(profile_id, dob) values (v_id, (current_date - interval '30 years 1 day')::date);
  select age_years into v_age from public.profiles where id = v_id;
  raise notice 'age sync on insert: % (expected 30)', v_age;
  update public.profile_birth set dob = (current_date - interval '41 years 1 day')::date where profile_id = v_id;
  select age_years into v_age from public.profiles where id = v_id;
  raise notice 'age sync on update: % (expected 41)', v_age;
  -- a member under 18 is refused
  begin
    update public.profile_birth set dob = current_date - 100 where profile_id = v_id;
    raise notice 'under-18 check: NOT enforced (unexpected)';
  exception when check_violation then raise notice 'under-18 check: enforced';
  end;
  rollback;
end $$;
