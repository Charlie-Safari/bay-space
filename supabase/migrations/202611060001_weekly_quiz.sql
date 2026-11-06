begin;

create table if not exists public.weekly_quizzes (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid not null references public.members(id) on delete restrict,
  week_start date not null unique check (extract(isodow from week_start) = 1),
  title text not null check (char_length(title) between 1 and 150),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 36),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_quiz_attempts (
  quiz_id uuid not null references public.weekly_quizzes(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  member_number integer not null,
  answers jsonb not null,
  correct_count integer not null check (correct_count between 0 and 36),
  question_count integer not null default 36 check (question_count = 36),
  points_awarded integer not null check (points_awarded = correct_count * 50),
  promotion_bonus bigint not null default 0 check (promotion_bonus >= 0),
  created_at timestamptz not null default now(),
  primary key (quiz_id, member_id)
);
create index if not exists weekly_quiz_attempts_member_idx on public.weekly_quiz_attempts(member_number);

alter table public.weekly_quizzes enable row level security;
alter table public.weekly_quiz_attempts enable row level security;
revoke all on public.weekly_quizzes, public.weekly_quiz_attempts from anon, authenticated;
grant select, insert, update, delete on public.weekly_quizzes, public.weekly_quiz_attempts to service_role;
drop policy if exists "service manages weekly quizzes" on public.weekly_quizzes;
create policy "service manages weekly quizzes" on public.weekly_quizzes for all to service_role using (true) with check (true);
drop policy if exists "service manages weekly quiz attempts" on public.weekly_quiz_attempts;
create policy "service manages weekly quiz attempts" on public.weekly_quiz_attempts for all to service_role using (true) with check (true);

create or replace function public.create_weekly_quiz(p_member_number integer, p_title text, p_week_start date, p_questions jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_member public.members%rowtype;
  v_question jsonb;
  v_id uuid;
  v_week date := date_trunc('week', now() at time zone 'America/Los_Angeles')::date;
begin
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null for update;
  if not found or not coalesce(v_member.gate_keys, '[]'::jsonb) ? 'impossible-badge' then raise exception 'Quiz authorship locked'; end if;
  if p_week_start is distinct from v_week then raise exception 'Publish a quiz for the current week'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 150 then raise exception 'Use a title of 1 to 150 characters'; end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 36 then raise exception 'Include exactly 36 questions'; end if;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(v_question -> 'question') is distinct from 'string' or char_length(trim(v_question ->> 'question')) not between 1 and 500 then raise exception 'Invalid question'; end if;
    if jsonb_typeof(v_question -> 'options') is distinct from 'array' or jsonb_array_length(v_question -> 'options') not between 2 and 4 then raise exception 'Use two to four answers'; end if;
    if exists (select 1 from jsonb_array_elements(v_question -> 'options') o where jsonb_typeof(o) <> 'string' or char_length(trim(o #>> '{}')) not between 1 and 200) then raise exception 'Invalid answer option'; end if;
    if (select count(distinct lower(trim(o))) from jsonb_array_elements_text(v_question -> 'options') o) <> jsonb_array_length(v_question -> 'options') then raise exception 'Answer options must be different'; end if;
    if coalesce(v_question ->> 'correctIndex', '') !~ '^[0-3]$' or (v_question ->> 'correctIndex')::integer >= jsonb_array_length(v_question -> 'options') then raise exception 'Choose the correct answer'; end if;
    if jsonb_typeof(v_question -> 'explanation') is distinct from 'string' or char_length(v_question ->> 'explanation') > 1500 then raise exception 'Invalid explanation'; end if;
    if not exists (select 1 from public.posts where id = (v_question ->> 'postId')::uuid and deleted_at is null and not incognito and moderation_status = 'active' and category = 'daily-food' and (created_at at time zone 'America/Los_Angeles')::date >= v_week - 7 and (created_at at time zone 'America/Los_Angeles')::date < v_week) then raise exception 'Choose a public Current Events article from last week'; end if;
  end loop;
  insert into public.weekly_quizzes(author_member_id, week_start, title, questions) values(v_member.id, p_week_start, trim(p_title), p_questions) returning id into v_id;
  return v_id;
end;
$$;

-- The service supplies promotion calculations using the existing rank rules.
-- Lock and compare the balance/rank snapshot so the reward and first result commit together.
create or replace function public.submit_weekly_quiz(p_member_number integer, p_quiz_id uuid, p_answers jsonb, p_expected jsonb, p_award jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member public.members%rowtype;
  v_quiz public.weekly_quizzes%rowtype;
  v_correct integer := 0;
  v_answer integer;
  v_points integer;
  v_bonus bigint;
  v_index integer;
begin
  select * into v_quiz from public.weekly_quizzes where id = p_quiz_id;
  if not found or v_quiz.week_start <> date_trunc('week', now() at time zone 'America/Los_Angeles')::date then raise exception 'This weekly quiz has closed'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 36 then raise exception 'Answer all 36 questions'; end if;
  for v_index in 0..35 loop
    if coalesce(p_answers ->> v_index, '') !~ '^[0-3]$' then raise exception 'Invalid answer'; end if;
    v_answer := (p_answers ->> v_index)::integer;
    if v_answer >= jsonb_array_length(v_quiz.questions -> v_index -> 'options') then raise exception 'Invalid answer'; end if;
    if v_answer = (v_quiz.questions -> v_index ->> 'correctIndex')::integer then v_correct := v_correct + 1; end if;
  end loop;
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null for update;
  if not found then raise exception 'Member not found'; end if;
  if exists (select 1 from public.weekly_quiz_attempts where quiz_id = p_quiz_id and member_id = v_member.id) then
    return jsonb_build_object('claimed', false, 'points', 0, 'promotionBonus', 0);
  end if;
  if jsonb_build_object('available_points', v_member.available_points, 'lifetime_points', v_member.lifetime_points, 'rank', v_member.rank, 'crypti_rank', v_member.crypti_rank, 'gate_keys', v_member.gate_keys) is distinct from p_expected then
    return jsonb_build_object('retry', true);
  end if;
  v_points := v_correct * 50;
  v_bonus := (p_award ->> 'lifetime_points')::bigint - coalesce(v_member.lifetime_points, 0) - v_points;
  if v_bonus is null or v_bonus < 0 or (p_award ->> 'available_points')::bigint is distinct from coalesce(v_member.available_points, 0) + v_points + v_bonus then raise exception 'Invalid reward calculation'; end if;
  insert into public.weekly_quiz_attempts(quiz_id, member_id, member_number, answers, correct_count, points_awarded, promotion_bonus)
    values(p_quiz_id, v_member.id, v_member.member_number, p_answers, v_correct, v_points, v_bonus);
  update public.members set available_points = (p_award ->> 'available_points')::bigint, lifetime_points = (p_award ->> 'lifetime_points')::bigint,
    rank = p_award ->> 'rank', crypti_rank = p_award ->> 'crypti_rank', updated_at = now() where id = v_member.id;
  return jsonb_build_object('claimed', true, 'points', v_points, 'promotionBonus', v_bonus);
end;
$$;

revoke all on function public.create_weekly_quiz(integer, text, date, jsonb) from public, anon, authenticated;
revoke all on function public.submit_weekly_quiz(integer, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_weekly_quiz(integer, text, date, jsonb) to service_role;
grant execute on function public.submit_weekly_quiz(integer, uuid, jsonb, jsonb, jsonb) to service_role;

commit;
