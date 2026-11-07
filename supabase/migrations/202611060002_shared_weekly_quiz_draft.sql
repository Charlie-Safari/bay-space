begin;

-- One shared, compacted question list for each upcoming quiz week.
create table if not exists public.weekly_quiz_drafts (
  week_start date primary key check (extract(isodow from week_start) = 1),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 36),
  last_editor_member_id uuid references public.members(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.weekly_quiz_drafts enable row level security;
revoke all on public.weekly_quiz_drafts from anon, authenticated;
grant select, insert, update, delete on public.weekly_quiz_drafts to service_role;
create policy "service manages weekly quiz drafts" on public.weekly_quiz_drafts for all to service_role using (true) with check (true);

-- Sunday 23:59 Pacific is treated as the start of the next quiz week.
create or replace function public.quiz_active_week()
returns date language sql stable set search_path = public as $$
  select date_trunc('week', (now() at time zone 'America/Los_Angeles') + interval '1 minute')::date
$$;

create or replace function public.publish_due_weekly_quiz()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_week date := public.quiz_active_week();
  v_draft public.weekly_quiz_drafts%rowtype;
  v_id uuid;
  v_questions jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('bay-space-weekly-quiz'), v_week - date '2000-01-01');
  select id into v_id from public.weekly_quizzes where week_start = v_week;
  if v_id is not null then return v_id; end if;
  select * into v_draft from public.weekly_quiz_drafts where week_start = v_week for update;
  if not found then return null; end if;
  v_questions := v_draft.questions;
  while jsonb_array_length(v_questions) < 36 loop
    v_questions := v_questions || 'null'::jsonb;
  end loop;
  -- The original table requires an author. Use the most recent editor or the oldest active member.
  if v_draft.last_editor_member_id is null then
    select id into v_draft.last_editor_member_id from public.members where deleted_at is null order by created_at limit 1;
  end if;
  if v_draft.last_editor_member_id is null then raise exception 'A member account is required before the first weekly quiz can post'; end if;
  insert into public.weekly_quizzes(author_member_id, week_start, title, questions)
    values(v_draft.last_editor_member_id, v_week, 'Weekly Current Events Quiz', v_questions)
    returning id into v_id;
  delete from public.weekly_quiz_drafts where week_start = v_week;
  insert into public.weekly_quiz_drafts(week_start) values(v_week + 7) on conflict do nothing;
  return v_id;
end;
$$;

-- Open the first blank editor for the upcoming week. Future editors reset on publication.
insert into public.weekly_quiz_drafts(week_start) values(public.quiz_active_week() + 7) on conflict do nothing;

create or replace function public.import_weekly_quiz_draft(p_member_number integer, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_question jsonb;
  v_result jsonb;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) < 1 or jsonb_array_length(p_questions) > 36 then raise exception 'Import 1 to 36 questions'; end if;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_result := public.edit_weekly_quiz_draft(p_member_number, 'append', null, v_question);
  end loop;
  return v_result;
end;
$$;

create or replace function public.edit_weekly_quiz_draft(p_member_number integer, p_action text, p_position integer default null, p_question jsonb default null, p_expected_week date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member public.members%rowtype;
  v_week date := public.quiz_active_week() + 7;
  v_draft public.weekly_quiz_drafts%rowtype;
  v_questions jsonb;
  v_count integer;
  v_position integer;
  v_option jsonb;
  v_source_id uuid;
begin
  if p_expected_week is not null and p_expected_week <> v_week then raise exception 'The quiz week changed. Reload the editor.'; end if;
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null;
  if not found or not coalesce(v_member.gate_keys, '[]'::jsonb) ? 'impossible-badge' then raise exception 'Quiz authorship locked'; end if;
  perform pg_advisory_xact_lock(hashtext('bay-space-weekly-quiz'), v_week - date '2000-01-01');
  insert into public.weekly_quiz_drafts(week_start) values(v_week) on conflict do nothing;
  select * into v_draft from public.weekly_quiz_drafts where week_start = v_week for update;
  v_questions := v_draft.questions;
  v_count := jsonb_array_length(v_questions);
  if p_action = 'append' or p_action = 'save' then
    if p_question is null or jsonb_typeof(p_question) <> 'object'
      or jsonb_typeof(p_question -> 'question') is distinct from 'string'
      or char_length(trim(p_question ->> 'question')) not between 1 and 500 then raise exception 'Enter a question of 1 to 500 characters'; end if;
    if jsonb_typeof(p_question -> 'options') is distinct from 'array' or jsonb_array_length(p_question -> 'options') not between 2 and 4 then raise exception 'Use 2 to 4 answers'; end if;
    if exists(select 1 from jsonb_array_elements(p_question -> 'options') o where jsonb_typeof(o) <> 'string' or char_length(trim(o #>> '{}')) not between 1 and 200) then raise exception 'Each answer needs 1 to 200 characters'; end if;
    if (select count(distinct lower(trim(o))) from jsonb_array_elements_text(p_question -> 'options') o) <> jsonb_array_length(p_question -> 'options') then raise exception 'Answers must be different'; end if;
    if coalesce(p_question ->> 'correctIndex', '') !~ '^[0-3]$' or (p_question ->> 'correctIndex')::integer >= jsonb_array_length(p_question -> 'options') then raise exception 'Select the correct answer'; end if;
    if jsonb_typeof(p_question -> 'explanation') is distinct from 'string' or char_length(p_question ->> 'explanation') > 1500 then raise exception 'Explanation is too long'; end if;
    if coalesce(p_question ->> 'postId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Choose a Current Events source'; end if;
    v_source_id := (p_question ->> 'postId')::uuid;
    if not exists(select 1 from public.posts where id = v_source_id and deleted_at is null and not incognito and moderation_status = 'active' and category = 'daily-food' and (created_at at time zone 'America/Los_Angeles')::date >= v_week - 7 and (created_at at time zone 'America/Los_Angeles')::date < v_week) then raise exception 'Choose a public Current Events article from this week'; end if;
    if p_action = 'append' then
      if v_count >= 36 then raise exception 'All 36 question slots are filled'; end if;
      v_position := v_count + 1;
    else
      if p_position is null or p_position < 1 or p_position > least(v_count + 1, 36) then raise exception 'Invalid question slot'; end if;
      v_position := p_position;
    end if;
    if v_position <= v_count then v_questions := jsonb_set(v_questions, array[(v_position - 1)::text], p_question); else v_questions := v_questions || jsonb_build_array(p_question); end if;
  elsif p_action = 'delete' then
    if p_position is null or p_position < 1 or p_position > v_count then raise exception 'Invalid question slot'; end if;
    select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb) into v_questions
      from jsonb_array_elements(v_questions) with ordinality as entry(value, ordinality) where ordinality <> p_position;
    v_position := p_position;
  else raise exception 'Invalid draft action'; end if;
  update public.weekly_quiz_drafts set questions = v_questions, last_editor_member_id = v_member.id, updated_at = now() where week_start = v_week;
  return jsonb_build_object('weekStart', v_week, 'questions', v_questions, 'position', v_position);
end;
$$;

-- Override the old manual publishing path and make blank slots valid bonus answers.
revoke execute on function public.create_weekly_quiz(integer, text, date, jsonb) from service_role;
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
  if not found or v_quiz.week_start <> public.quiz_active_week() then raise exception 'This weekly quiz has closed'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 36 then raise exception 'Answer all 36 questions'; end if;
  for v_index in 0..35 loop
    if v_quiz.questions -> v_index = 'null'::jsonb then
      if p_answers -> v_index <> '-1'::jsonb then raise exception 'Blank slots must use the bonus answer'; end if;
      v_correct := v_correct + 1;
    else
      if coalesce(p_answers ->> v_index, '') !~ '^[0-3]$' then raise exception 'Invalid answer'; end if;
      v_answer := (p_answers ->> v_index)::integer;
      if v_answer >= jsonb_array_length(v_quiz.questions -> v_index -> 'options') then raise exception 'Invalid answer'; end if;
      if v_answer = (v_quiz.questions -> v_index ->> 'correctIndex')::integer then v_correct := v_correct + 1; end if;
    end if;
  end loop;
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null for update;
  if not found then raise exception 'Member not found'; end if;
  if exists (select 1 from public.weekly_quiz_attempts where quiz_id = p_quiz_id and member_id = v_member.id) then return jsonb_build_object('claimed', false, 'points', 0, 'promotionBonus', 0); end if;
  if jsonb_build_object('available_points', v_member.available_points, 'lifetime_points', v_member.lifetime_points, 'rank', v_member.rank, 'crypti_rank', v_member.crypti_rank, 'gate_keys', v_member.gate_keys) is distinct from p_expected then return jsonb_build_object('retry', true); end if;
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

revoke all on function public.quiz_active_week() from public, anon, authenticated;
revoke all on function public.publish_due_weekly_quiz() from public, anon, authenticated;
revoke all on function public.edit_weekly_quiz_draft(integer, text, integer, jsonb, date) from public, anon, authenticated;
revoke all on function public.import_weekly_quiz_draft(integer, jsonb) from public, anon, authenticated;
grant execute on function public.quiz_active_week() to service_role;
grant execute on function public.publish_due_weekly_quiz() to service_role;
grant execute on function public.edit_weekly_quiz_draft(integer, text, integer, jsonb, date) to service_role;
grant execute on function public.import_weekly_quiz_draft(integer, jsonb) to service_role;

-- Two UTC hours cover Pacific daylight and standard time. The local-time guard
-- stops the other run from publishing early. Request-time rollover is a backup.
create extension if not exists pg_cron;
select cron.schedule('bay-space-quiz-pacific-daylight', '59 6 * * 1', $$select public.publish_due_weekly_quiz()$$);
select cron.schedule('bay-space-quiz-pacific-standard', '59 7 * * 1', $$select public.publish_due_weekly_quiz()$$);

commit;
