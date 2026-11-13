-- 너와 아케이드 온라인 랭킹: Supabase SQL Editor 에 통째로 붙여 넣고 Run.
-- (이 파일은 schema.sql 을 바탕으로 build_hub.py 가 만듭니다. 고칠 때는 schema.sql 을 고치세요)
-- 여러 번 실행해도 안전합니다. 새 게임이 추가되면 다시 실행해서 점수 상한만 갱신하면 됩니다.

create table if not exists public.scores (
  id bigserial primary key,
  game text not null check (game ~ '^[a-z0-9_]{2,20}$'),
  name text not null check (char_length(name) between 1 and 12),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index if not exists scores_game_score on public.scores (game, score desc);
create index if not exists scores_game_time on public.scores (game, created_at desc);

create table if not exists public.score_limits (
  game text primary key,
  max_score integer not null
);

-- 표를 직접 읽고 쓰는 것은 막고, 아래 두 함수로만 사용
alter table public.scores enable row level security;
alter table public.score_limits enable row level security;
revoke all on public.scores from anon, authenticated;
revoke all on public.score_limits from anon, authenticated;

-- 게임별 점수 상한 (이보다 큰 점수는 조작으로 보고 거절)
insert into public.score_limits (game, max_score) values
  ('shooting', 10000000),
  ('snake', 10000000),
  ('breakout', 10000000),
  ('runner', 10000000),
  ('tower', 10000000),
  ('orbit', 10000000),
  ('dodge', 10000000),
  ('blocks', 10000000),
  ('mines', 10000000),
  ('sudoku', 10000000),
  ('cave', 200000),
  ('ring', 20000),
  ('archery', 5000),
  ('lanes', 300000),
  ('gravity', 200000),
  ('rocks', 500000),
  ('slash', 300000),
  ('hockey', 100000),
  ('keeper', 10000),
  ('whack', 20000),
  ('racer', 500000),
  ('fishy', 300000),
  ('defense', 1000000),
  ('survivor', 2000000),
  ('maze', 200000),
  ('jumper', 1000000),
  ('artillery', 100000),
  ('pinball', 50000000),
  ('slide', 100000),
  ('lights', 1000000),
  ('gems', 10000000),
  ('memory', 1000000),
  ('sequence', 100000),
  ('pipes', 1000000),
  ('nonogram', 100000),
  ('bubbles', 10000000),
  ('flood', 1000000),
  ('pairs', 1000000),
  ('dots', 100000),
  ('gomoku', 100000),
  ('reversi', 100000),
  ('solitaire', 100000),
  ('blackjack', 1000000),
  ('baseball', 1000000),
  ('reaction', 2000),
  ('math', 100000),
  ('stroop', 100000),
  ('aim', 100000),
  ('oddcolor', 100000),
  ('schulte', 100000),
  ('baduk', 400000)
on conflict (game) do update set max_score = excluded.max_score;

-- 점수 등록: 이름 정리, 상한 검사, 같은 이름 20초 안 재등록 금지
create or replace function public.submit_score(p_game text, p_name text, p_score integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  lim integer;
  clean text;
  r integer;
  tot integer;
begin
  clean := btrim(regexp_replace(coalesce(p_name, ''), '[<>"''`\\]', '', 'g'));
  if clean = '' or char_length(clean) > 12 then raise exception 'bad name'; end if;
  select max_score into lim from score_limits where game = p_game;
  if lim is null then raise exception 'unknown game'; end if;
  if p_score is null or p_score < 1 or p_score > lim then raise exception 'bad score'; end if;
  if exists (select 1 from scores where game = p_game and name = clean and created_at > now() - interval '20 seconds') then
    raise exception 'too fast';
  end if;
  insert into scores (game, name, score) values (p_game, clean, p_score);
  select count(*) + 1 into r from (select name, max(score) best from scores where game = p_game group by name) t where t.best > p_score;
  select count(distinct name) into tot from scores where game = p_game;
  return json_build_object('rank', r, 'total', tot);
end;
$$;

-- 순위표: 이름마다 가장 좋은 점수 1개. p_period = 'all'(전체) / 'week'(최근 7일)
create or replace function public.top_scores(p_game text, p_period text default 'all', p_limit integer default 10)
returns table (name text, score integer, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, max(s.score) as score, max(s.created_at) as created_at
  from scores s
  where s.game = p_game
    and (p_period <> 'week' or s.created_at > now() - interval '7 days')
  group by s.name
  order by score desc, created_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
$$;

grant execute on function public.submit_score(text, text, integer) to anon;
grant execute on function public.top_scores(text, text, integer) to anon;
