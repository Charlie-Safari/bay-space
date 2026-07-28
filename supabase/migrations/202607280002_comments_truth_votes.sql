create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_member_id uuid references public.members(id) on delete set null,
  author_member_number integer,
  body text not null default '',
  moderation_status moderation_status not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_truth_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 11),
  point_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create index if not exists post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at asc)
  where deleted_at is null;

create index if not exists post_truth_votes_member_idx
  on public.post_truth_votes (member_id);

alter table public.post_comments enable row level security;
alter table public.post_truth_votes enable row level security;

revoke all on table
  public.post_comments,
  public.post_truth_votes
from anon, authenticated;

grant select, insert, update, delete on table
  public.post_comments,
  public.post_truth_votes
to service_role;

comment on table public.post_comments is
  'RLS enabled. Comments are managed through Bay Space server API routes.';

comment on table public.post_truth_votes is
  'RLS enabled. Stores one truth scale vote per member and post.';
