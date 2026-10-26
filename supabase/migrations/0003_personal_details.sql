-- =====================================================================
-- 0003 PERSONAL DETAILS (run ONCE in Supabase -> SQL Editor, BEFORE deploying the new code)
-- Adds: number of children, weight, body type, skin tone, mother tongue, hobbies, personality traits.
-- Height keeps using the existing height_cm column (shown to members in feet + inches).
-- Safe to run twice.
-- =====================================================================
alter table public.profiles
  add column if not exists children_count int check (children_count is null or children_count between 0 and 20),
  add column if not exists weight_kg int check (weight_kg is null or weight_kg between 30 and 250),
  add column if not exists body_type text check (body_type is null or body_type in ('slim','average','athletic','heavy')),
  add column if not exists skin_tone text check (skin_tone is null or skin_tone in ('very_fair','fair','wheatish','brown','dark')),
  add column if not exists mother_tongue text check (mother_tongue is null or mother_tongue in ('urdu','punjabi','saraiki','sindhi','pashto','balochi','other')),
  add column if not exists hobbies text check (hobbies is null or length(hobbies) <= 200),
  add column if not exists personality text[] not null default '{}';
