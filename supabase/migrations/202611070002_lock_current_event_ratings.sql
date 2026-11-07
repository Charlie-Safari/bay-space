begin;

-- A saved rating must be removed before submitting another score.
create or replace function public.set_current_event_rating(
  p_post_id uuid,
  p_member_number integer,
  p_dimension text,
  p_score integer,
  p_expected_updated_at timestamptz,
  p_reward jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_post public.posts%rowtype;
  v_existing_score integer;
  v_truth_total bigint;
  v_truth_count bigint;
  v_relevance_total bigint;
  v_relevance_count bigint;
begin
  if p_dimension is null or p_dimension not in ('truth', 'relevance')
    or p_score is null or p_score < 0 or p_score > 11 then
    raise exception 'Invalid Current Events rating';
  end if;

  select * into v_member from public.members
  where member_number = p_member_number and deleted_at is null for update;
  if not found then return jsonb_build_object('notFound', true); end if;
  if v_member.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('retry', true);
  end if;

  select * into v_post from public.posts
  where id = p_post_id and deleted_at is null and moderation_status = 'active'
    and category in ('daily-food', 'top-story')
    and coalesce(meta ->> 'cryptiPost', 'false') <> 'true'
  for update;
  if not found then return jsonb_build_object('notFound', true); end if;

  -- The member and post locks serialize submissions from concurrent tabs.
  select case when p_dimension = 'truth' then score else relevance_score end
  into v_existing_score
  from public.post_truth_votes
  where post_id = p_post_id and member_id = v_member.id and rating_version = 2;

  if p_score = coalesce(v_existing_score, 0) then
    return jsonb_build_object('saved', true);
  end if;
  if p_score > 0 and v_existing_score > 0 then
    return jsonb_build_object('alreadyVoted', true);
  end if;

  insert into public.post_truth_votes (
    post_id, member_id, score, relevance_score, point_value, rating_version
  ) values (
    p_post_id, v_member.id,
    case when p_dimension = 'truth' then p_score else 0 end,
    case when p_dimension = 'relevance' then p_score else 0 end,
    p_score, 2
  )
  on conflict (post_id, member_id) do update set
    score = case when p_dimension = 'truth' then p_score
      when post_truth_votes.rating_version = 2 then post_truth_votes.score else 0 end,
    relevance_score = case when p_dimension = 'relevance' then p_score
      when post_truth_votes.rating_version = 2 then post_truth_votes.relevance_score else 0 end,
    rating_version = 2, updated_at = now();

  update public.post_truth_votes
  set point_value = score + relevance_score
  where post_id = p_post_id and member_id = v_member.id;

  if p_dimension = 'truth' and p_reward is not null
    and v_post.author_member_id is distinct from v_member.id then
    update public.members set
      available_points = (p_reward ->> 'available_points')::bigint,
      lifetime_points = (p_reward ->> 'lifetime_points')::bigint,
      rank = coalesce(p_reward ->> 'rank', rank),
      crypti_rank = coalesce(p_reward ->> 'crypti_rank', crypti_rank),
      links = coalesce(links, '{}'::jsonb) || jsonb_build_object(
        '_participationRewardKeys', p_reward -> 'reward_keys'
      ),
      updated_at = clock_timestamp()
    where id = v_member.id;
  end if;

  select coalesce(sum(score), 0), count(*) filter (where score > 0),
    coalesce(sum(relevance_score), 0), count(*) filter (where relevance_score > 0)
  into v_truth_total, v_truth_count, v_relevance_total, v_relevance_count
  from public.post_truth_votes where post_id = p_post_id and rating_version = 2;

  update public.posts set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
    'truthAverageScore', case when v_truth_count > 0
      then round(v_truth_total::numeric / v_truth_count, 1)::text else '0.0' end,
    'truthPointTenths', ((v_truth_total + v_relevance_total) * 10)::text,
    'truthScoreTotal', v_truth_total::text, 'truthVoteCount', v_truth_count::text,
    'relevanceAverageScore', case when v_relevance_count > 0
      then round(v_relevance_total::numeric / v_relevance_count, 1)::text else '0.0' end,
    'relevanceScoreTotal', v_relevance_total::text,
    'relevanceVoteCount', v_relevance_count::text, 'currentEventRatingVersion', '2'
  ), updated_at = now() where id = p_post_id;

  return jsonb_build_object('saved', true);
end;
$$;

notify pgrst, 'reload schema';

commit;
