-- Synthetic accounts only. Fixed ids so the tests can refer to them.
-- admin  = 00000000-0000-0000-0000-0000000000ad
-- A (male, verified)   = ...0a   B (female, verified) = ...0b   C (pending) = ...0c
insert into auth.users(id) values
 ('00000000-0000-0000-0000-0000000000ad'),('00000000-0000-0000-0000-00000000000a'),
 ('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');

insert into public.profiles (id, role, status, is_verified, full_name, gender, marital_status, dob, city, photo_path, valid_until, pref_age_min, pref_age_max)
values
 ('00000000-0000-0000-0000-0000000000ad','admin','verified',true,'Admin One','male','single', date '1985-01-01','Bahawalpur',null,null,18,60),
 ('00000000-0000-0000-0000-00000000000a','member','verified',true,'Member A','male','single',  date '1994-05-05','Bahawalpur','00000000-0000-0000-0000-00000000000a/photo.jpg', now()+interval '90 days',18,60),
 ('00000000-0000-0000-0000-00000000000b','member','verified',true,'Member B','female','single',date '1996-07-07','Bahawalpur','00000000-0000-0000-0000-00000000000b/photo.jpg', now()+interval '90 days',18,60),
 ('00000000-0000-0000-0000-00000000000c','member','pending',false,'Member C','female','single',date '1997-09-09','Bahawalpur','00000000-0000-0000-0000-00000000000c/photo.jpg', null,18,60);

insert into public.profile_private (profile_id, cnic_number, cnic_front_path, cnic_back_path, phone) values
 ('00000000-0000-0000-0000-00000000000a','11111-1111111-1','00000000-0000-0000-0000-00000000000a/cnic-front.jpg','00000000-0000-0000-0000-00000000000a/cnic-back.jpg','03000000001'),
 ('00000000-0000-0000-0000-00000000000b','22222-2222222-2','00000000-0000-0000-0000-00000000000b/cnic-front.jpg','00000000-0000-0000-0000-00000000000b/cnic-back.jpg','03000000002'),
 ('00000000-0000-0000-0000-00000000000c','33333-3333333-3','00000000-0000-0000-0000-00000000000c/cnic-front.jpg','00000000-0000-0000-0000-00000000000c/cnic-back.jpg','03000000003');

insert into storage.objects (bucket_id, name) values
 ('cnic-documents','00000000-0000-0000-0000-00000000000a/cnic-front.jpg'),
 ('cnic-documents','00000000-0000-0000-0000-00000000000b/cnic-front.jpg'),
 ('profile-photos','00000000-0000-0000-0000-00000000000b/photo.jpg');
