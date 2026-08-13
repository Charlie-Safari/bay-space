create table if not exists public.member_post_shares (
  member_id uuid not null references public.members(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  share_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, post_id)
);

create index if not exists member_post_shares_member_updated_at_idx
  on public.member_post_shares (member_id, updated_at desc);

create index if not exists member_post_shares_post_idx
  on public.member_post_shares (post_id);

alter table public.member_post_shares enable row level security;

revoke all on table public.member_post_shares from anon, authenticated;

grant select, insert, update, delete on table public.member_post_shares
to service_role;

comment on table public.member_post_shares is
  'RLS enabled. Tracks logged-in member share counts per post for stats.';
