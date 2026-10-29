-- Functional test of the rate limiter (service role semantics)
do $$
declare r boolean[]; i int; v boolean;
begin
  r := '{}';
  for i in 1..5 loop
    v := public.rate_limit_hit('test:key', 3, 3600);
    r := r || v;
  end loop;
  raise notice 'hits 1..5 with limit 3 -> % (expected {t,t,t,f,f})', r;
  update public.rate_limits set window_start = now() - interval '2 hours' where key = 'test:key';
  raise notice 'after the window passed -> % (expected t)', public.rate_limit_hit('test:key', 3, 3600);
  raise notice 'independent key unaffected -> % (expected t)', public.rate_limit_hit('other:key', 3, 3600);
  raise notice 'purge removed % old rows', public.purge_rate_limits();
  rollback;
end $$;
