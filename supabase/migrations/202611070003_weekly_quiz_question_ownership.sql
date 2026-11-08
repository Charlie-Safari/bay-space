begin;

-- Keep existing questions in the draft with IDs but without guessed authors.
update public.weekly_quiz_drafts draft
set questions = (
  select coalesce(jsonb_agg(
    case when value ? 'id' then value else value || jsonb_build_object('id', gen_random_uuid()) end
    order by ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(draft.questions) with ordinality
)
where exists (select 1 from jsonb_array_elements(draft.questions) value where not value ? 'id');

create or replace function public.edit_owned_weekly_quiz_draft(p_member_number integer, p_action text, p_question_id uuid, p_question jsonb, p_expected_week date)
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
  v_existing jsonb;
  v_saved jsonb;
begin
  if p_expected_week is not null and p_expected_week <> v_week then raise exception 'The quiz week changed. Reload the editor.'; end if;
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null;
  if not found or not coalesce(v_member.gate_keys, '[]'::jsonb) ? 'impossible-badge' then raise exception 'Quiz authorship locked'; end if;
  perform pg_advisory_xact_lock(hashtext('bay-space-weekly-quiz'), v_week - date '2000-01-01');
  if exists(select 1 from public.weekly_quizzes where week_start = v_week) then
    raise exception 'The quiz week changed. Reload the editor.';
  end if;
  insert into public.weekly_quiz_drafts(week_start) values(v_week) on conflict do nothing;
  select * into v_draft from public.weekly_quiz_drafts where week_start = v_week for update;
  v_questions := v_draft.questions;
  v_count := jsonb_array_length(v_questions);
  if p_question_id is not null then
    select value, ordinality::int into v_existing, v_position
    from jsonb_array_elements(v_questions) with ordinality
    where value->>'id' = p_question_id::text;
  end if;
  if p_action in ('save', 'delete') then
    if v_existing is null then raise exception 'This question is no longer in the draft'; end if;
    if v_existing->>'authorMember' is distinct from v_member.member_number::text then
      raise exception using errcode = '42501', message = 'Only the question author can edit or delete it';
    end if;
  end if;
  if p_action in ('append', 'save') then
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
    v_saved := jsonb_build_object(
      'id', coalesce(p_question_id, gen_random_uuid()),
      'authorMember', v_member.member_number,
      'question', p_question->'question',
      'options', p_question->'options',
      'correctIndex', p_question->'correctIndex',
      'explanation', p_question->'explanation',
      'postId', p_question->'postId'
    );
    if p_action = 'append' then
      if v_existing is not null then
        if v_existing <> v_saved then raise exception 'This question ID is already in use'; end if;
        return jsonb_build_object('weekStart', v_week, 'questions', v_questions, 'position', v_position);
      end if;
      if v_count >= 36 then raise exception 'All 36 question slots are filled'; end if;
      v_position := v_count + 1;
      v_questions := v_questions || jsonb_build_array(v_saved);
    else
      v_questions := jsonb_set(v_questions, array[(v_position - 1)::text], v_saved);
    end if;
  elsif p_action = 'delete' then
    v_questions := v_questions - (v_position - 1);
  else raise exception 'Invalid draft action'; end if;
  update public.weekly_quiz_drafts set questions = v_questions, last_editor_member_id = v_member.id, updated_at = now() where week_start = v_week;
  return jsonb_build_object('weekStart', v_week, 'questions', v_questions, 'position', v_position);
end;
$$;

-- Existing callers can still append. Positional edits and deletes are unsafe after renumbering.
create or replace function public.edit_weekly_quiz_draft(
  p_member_number integer, p_action text, p_position integer default null,
  p_question jsonb default null, p_expected_week date default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_action is distinct from 'append' then raise exception 'Reload the quiz editor to edit or delete questions'; end if;
  return public.edit_owned_weekly_quiz_draft(p_member_number, 'append', null, p_question, p_expected_week);
end;
$$;

create or replace function public.import_owned_weekly_quiz_draft(
  p_member_number integer, p_questions jsonb, p_expected_week date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_question jsonb;
  v_result jsonb;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array'
    or jsonb_array_length(p_questions) not between 1 and 36 then raise exception 'Import 1 to 36 questions'; end if;
  for v_question in select value from jsonb_array_elements(p_questions) loop
    v_result := public.edit_owned_weekly_quiz_draft(p_member_number, 'append', null, v_question, p_expected_week);
  end loop;
  return v_result;
end;
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
  select coalesce(jsonb_agg(
    case when jsonb_typeof(value) = 'object' then value - 'id' - 'authorMember' else value end
    order by ordinality
  ), '[]'::jsonb) into v_questions
  from jsonb_array_elements(v_draft.questions) with ordinality;
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

revoke all on function public.edit_owned_weekly_quiz_draft(integer, text, uuid, jsonb, date) from public, anon, authenticated;
revoke all on function public.import_owned_weekly_quiz_draft(integer, jsonb, date) from public, anon, authenticated;
grant execute on function public.edit_owned_weekly_quiz_draft(integer, text, uuid, jsonb, date) to service_role;
grant execute on function public.import_owned_weekly_quiz_draft(integer, jsonb, date) to service_role;

commit;
