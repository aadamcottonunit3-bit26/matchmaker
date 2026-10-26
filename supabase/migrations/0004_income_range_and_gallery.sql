-- =====================================================================
-- 0004 INCOME RANGE + HOME GALLERY (run ONCE in Supabase -> SQL Editor, BEFORE deploying the new code)
-- * pref_income_max_pkr : upper end of the "monthly income required" range (min already exists)
-- * cms_sliders.placement : 'hero' (top banner) or 'gallery' (photo section) on the home page
-- Safe to run twice.
-- =====================================================================
alter table public.profiles
  add column if not exists pref_income_max_pkr numeric(12,2);

alter table public.cms_sliders
  add column if not exists placement text not null default 'hero'
    check (placement in ('hero','gallery'));
