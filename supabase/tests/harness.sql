create schema if not exists test;
create table if not exists test.results (phase text, label text, expected text, got text, ok boolean, detail text);

-- Runs one statement as a given role/user, then ROLLS IT BACK so tests do not affect each other.
create or replace function test.run(p_phase text, p_label text, p_role text, p_uid uuid, p_sql text, p_expect text)
returns void language plpgsql as $$
declare v_got text; v_n bigint; v_msg text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), false);
  begin
    execute format('set local role %I', p_role);
    if p_expect like 'count=%' then
      execute 'select count(*) from (' || p_sql || ') q' into v_n;
      v_got := 'count=' || v_n;
    else
      execute p_sql;
      v_got := 'ok';
    end if;
    raise exception using message = '__rollback__';
  exception when others then
    if sqlerrm <> '__rollback__' then v_got := 'fail'; v_msg := sqlerrm; end if;
  end;
  insert into test.results values (p_phase, p_label, p_expect, v_got, v_got = p_expect, v_msg);
end $$;

create or replace function test.report(p_phase text) returns void language plpgsql as $$
declare r record;
begin
  for r in select * from test.results where phase = p_phase order by ctid loop
    raise notice '% | % | expected=% got=% %',
      case when r.ok then 'PASS' else 'FAIL' end, r.label, r.expected, r.got,
      coalesce('('||left(r.detail,70)||')','');
  end loop;
  raise notice '--- % : % passed, % failed', p_phase,
    (select count(*) from test.results where phase = p_phase and ok),
    (select count(*) from test.results where phase = p_phase and not ok);
end $$;
