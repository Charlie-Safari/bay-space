create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_member_id uuid not null references public.members(id) on delete cascade,
  recipient_member_id uuid not null references public.members(id) on delete cascade,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  constraint direct_messages_body_length check (char_length(body) <= 1000)
);

create table if not exists public.direct_message_blocks (
  blocker_member_id uuid not null references public.members(id) on delete cascade,
  blocked_member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_member_id, blocked_member_id),
  constraint direct_message_blocks_no_self check (blocker_member_id <> blocked_member_id)
);

create index if not exists direct_messages_sender_created_at_idx
  on public.direct_messages (sender_member_id, created_at desc);

create index if not exists direct_messages_recipient_created_at_idx
  on public.direct_messages (recipient_member_id, created_at desc);

create index if not exists direct_messages_expires_at_idx
  on public.direct_messages (expires_at);

create index if not exists direct_message_blocks_blocked_idx
  on public.direct_message_blocks (blocked_member_id);

alter table public.direct_messages enable row level security;
alter table public.direct_message_blocks enable row level security;

revoke all on table
  public.direct_messages,
  public.direct_message_blocks
from anon, authenticated;

grant select, insert, update, delete on table
  public.direct_messages,
  public.direct_message_blocks
to service_role;

comment on table public.direct_messages is
  'RLS enabled. Text-only direct messages are handled through Bay Space API routes and expire after 7 days.';

comment on table public.direct_message_blocks is
  'RLS enabled. Stores reversible direct-message blocks between members.';
