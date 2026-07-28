create table if not exists public.member_article_reads (
  member_id uuid not null references public.members(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  point_value integer not null default 5,
  created_at timestamptz not null default now(),
  primary key (member_id, post_id)
);

create index if not exists member_article_reads_member_created_at_idx
  on public.member_article_reads (member_id, created_at desc);

create index if not exists member_article_reads_post_idx
  on public.member_article_reads (post_id);

alter table public.member_article_reads enable row level security;

revoke all on table public.member_article_reads from anon, authenticated;

grant select, insert, update, delete on table public.member_article_reads
to service_role;

comment on table public.member_article_reads is
  'RLS enabled. Tracks one article-open point reward per member and post.';
