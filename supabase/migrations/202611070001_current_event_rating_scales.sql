begin;

alter table public.post_truth_votes
  add column if not exists relevance_score integer not null default 0
    check (relevance_score between 0 and 11),
  add column if not exists rating_version integer not null default 1;

-- Zero is unrated. Reset only the old Current Events ratings, including archives.
update public.post_truth_votes v
set score = 0, relevance_score = 0, point_value = 0, rating_version = 2,
    updated_at = now()
from public.posts p
where p.id = v.post_id
  and p.category in ('daily-food', 'top-story')
  and coalesce(p.meta ->> 'cryptiPost', 'false') <> 'true'
  and v.rating_version < 2;

update public.posts
set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
  'truthAverageScore', '0.0', 'truthPointTenths', '0',
  'truthScoreTotal', '0', 'truthVoteCount', '0',
  'relevanceAverageScore', '0.0', 'relevanceScoreTotal', '0',
  'relevanceVoteCount', '0', 'currentEventRatingVersion', '2'
), updated_at = now()
where category in ('daily-food', 'top-story')
  and coalesce(meta ->> 'cryptiPost', 'false') <> 'true'
  and coalesce(meta ->> 'currentEventRatingVersion', '1') <> '2';

-- A single transaction keeps both scales, post scores and participation rewards
-- consistent. Explicit set/clear requests are safe to retry.
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

revoke all on function public.set_current_event_rating(uuid, integer, text, integer, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.set_current_event_rating(uuid, integer, text, integer, timestamptz, jsonb)
  to service_role;

commit;
