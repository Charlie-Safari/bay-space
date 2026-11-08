begin;

alter table public.members
  add column if not exists graduation_milestone_at timestamptz;

create index if not exists post_comments_rank_participation_idx
  on public.post_comments (author_member_id, post_id)
  where deleted_at is null and moderation_status = 'active';

create index if not exists weekly_quiz_attempts_rank_participation_idx
  on public.weekly_quiz_attempts (member_id);

-- Use the existing activity records so members get credit for prior participation.
create or replace function public.get_bay_rank_participation(p_member_id uuid)
returns jsonb
language sql stable
set search_path = public
as $$
  with reads as (
    select
      count(*) filter (where p.category = 'theory') as conspiracy,
      count(*) filter (where p.category in ('top-story', 'daily-food')) as current_events
    from public.member_article_reads r
    join public.posts p on p.id = r.post_id
    where r.member_id = p_member_id
      and p.meta ->> 'cryptiPost' is distinct from 'true'
  ), comments as (
    select
      count(*) as total,
      count(*) filter (where p.category = 'theory') as conspiracy,
      count(*) filter (where p.category in ('top-story', 'daily-food')) as current_events
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    where c.author_member_id = p_member_id
      and c.deleted_at is null and c.moderation_status = 'active'
      and p.meta ->> 'cryptiPost' is distinct from 'true'
  ), ratings as (
    select
      count(*) filter (where p.category = 'theory' and v.score > 0) as conspiracy,
      count(*) filter (
        where p.category in ('top-story', 'daily-food') and v.rating_version = 2
          and (v.score > 0 or v.relevance_score > 0)
      ) as current_events
    from public.post_truth_votes v
    join public.posts p on p.id = v.post_id
    where v.member_id = p_member_id
      and p.meta ->> 'cryptiPost' is distinct from 'true'
  )
  select jsonb_build_object(
    'conspiracyReads', reads.conspiracy,
    'currentEventsReads', reads.current_events,
    'comments', comments.total,
    'conspiracyComments', comments.conspiracy,
    'currentEventsComments', comments.current_events,
    'conspiracyRatings', ratings.conspiracy,
    'currentEventsRatings', ratings.current_events,
    'shares', (
      select count(*) from public.member_post_shares s
      join public.posts p on p.id = s.post_id
      where s.member_id = p_member_id and s.share_count > 0
        and p.meta ->> 'cryptiPost' is distinct from 'true'
    ),
    'favorites', (
      select count(*) from public.saved_posts s
      join public.posts p on p.id = s.post_id
      where s.member_id = p_member_id
        and p.meta ->> 'cryptiPost' is distinct from 'true'
    ),
    'quizzes', (
      select count(*) from public.weekly_quiz_attempts where member_id = p_member_id
    ),
    'polls', (
      select count(*) from public.poll_votes where member_id = p_member_id
    )
  )
  from reads cross join comments cross join ratings;
$$;

revoke all on function public.get_bay_rank_participation(uuid) from public, anon, authenticated;
grant execute on function public.get_bay_rank_participation(uuid) to service_role;

notify pgrst, 'reload schema';
commit;
