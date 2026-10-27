-- Rollback for 0007: puts the date of birth back into profiles.dob (copied from profile_birth).
alter table public.profiles add column if not exists dob date;
update public.profiles p set dob = b.dob from public.profile_birth b where b.profile_id = p.id;
notify pgrst, 'reload schema';
-- Then re-run the protect_profile_columns() definition from 0006 (it mentions dob again).
