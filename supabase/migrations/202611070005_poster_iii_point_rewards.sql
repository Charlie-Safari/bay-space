begin;

alter table public.weekly_quiz_attempts
  drop constraint if exists weekly_quiz_attempts_check,
  drop constraint if exists weekly_quiz_attempts_points_per_answer_check;

alter table public.weekly_quiz_attempts
  add constraint weekly_quiz_attempts_points_per_answer_check
  check (points_awarded in (correct_count * 50, correct_count * 100));

-- Apply the rank multiplier to point rewards calculated in the database.
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
  v_points := v_correct * 50 * case when v_member.rank = 'poster-iii' then 2 else 1 end;
  v_bonus := (p_award ->> 'lifetime_points')::bigint - coalesce(v_member.lifetime_points, 0) - v_points;
  if v_bonus is null or v_bonus < 0 or (p_award ->> 'available_points')::bigint is distinct from coalesce(v_member.available_points, 0) + v_points + v_bonus then raise exception 'Invalid reward calculation'; end if;
  insert into public.weekly_quiz_attempts(quiz_id, member_id, member_number, answers, correct_count, points_awarded, promotion_bonus)
    values(p_quiz_id, v_member.id, v_member.member_number, p_answers, v_correct, v_points, v_bonus);
  update public.members set available_points = (p_award ->> 'available_points')::bigint, lifetime_points = (p_award ->> 'lifetime_points')::bigint,
    rank = p_award ->> 'rank', crypti_rank = p_award ->> 'crypti_rank', updated_at = now() where id = v_member.id;
  return jsonb_build_object('claimed', true, 'points', v_points, 'promotionBonus', v_bonus);
end;
$$;

create or replace function public.settle_one_bay_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_winning_option uuid;
  v_high_count integer := 0;
  v_high_count_options integer := 0;
  v_vote record;
  v_payout integer;
begin
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_poll.status in ('settled', 'cancelled') or v_poll.closes_at > now() then
    return;
  end if;

  select coalesce(max(vote_count), 0) into v_high_count
  from (
    select option_id, count(*)::integer as vote_count
    from public.poll_votes
    where poll_id = p_poll_id
    group by option_id
  ) totals;

  if v_high_count > 0 then
    select count(*)::integer
      into v_high_count_options
    from (
      select option_id, count(*)::integer as vote_count
      from public.poll_votes
      where poll_id = p_poll_id
      group by option_id
    ) totals
    where vote_count = v_high_count;

    if v_high_count_options = 1 then
      select option_id into v_winning_option
      from (
        select option_id, count(*)::integer as vote_count
        from public.poll_votes
        where poll_id = p_poll_id
        group by option_id
      ) totals
      where vote_count = v_high_count
      limit 1;
    else
      v_winning_option := null;
    end if;
  end if;

  for v_vote in
    select * from public.poll_votes where poll_id = p_poll_id and outcome = 'pending' for update
  loop
    if v_winning_option is null then
      if v_vote.wager_currency = 'coins' and v_vote.wager_amount > 0 then
        update public.members set bayo_coins = bayo_coins + v_vote.wager_amount, updated_at = now()
        where id = v_vote.member_id;
      elsif v_vote.wager_currency = 'token' and v_vote.wager_amount = 1 then
        update public.members
        set links = jsonb_set(
          coalesce(links, '{}'::jsonb),
          '{_bayoTokens}',
          to_jsonb(coalesce(nullif(links ->> '_bayoTokens', '')::integer, 0) + 1),
          true
        ), updated_at = now()
        where id = v_vote.member_id;
      end if;

      update public.poll_votes set outcome = 'refunded', settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    elsif v_vote.option_id = v_winning_option then
      v_payout := v_vote.wager_point_value * 2;
      if v_payout > 0 then
        update public.members
        set available_points = available_points + v_payout * case when rank = 'poster-iii' then 2 else 1 end,
            updated_at = now()
        where id = v_vote.member_id
        returning v_payout * case when rank = 'poster-iii' then 2 else 1 end into v_payout;
      end if;
      update public.poll_votes set outcome = 'won', payout_points = v_payout, settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    else
      update public.poll_votes set outcome = 'lost', settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    end if;
  end loop;

  update public.polls
  set status = 'settled', winning_option_id = v_winning_option, updated_at = now()
  where id = p_poll_id;
end;
$$;

commit;
