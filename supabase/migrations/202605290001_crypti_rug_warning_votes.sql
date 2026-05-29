create table if not exists crypti_ticker_rug_warning_votes (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references crypti_tickers(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker_id, member_id)
);

create index if not exists crypti_ticker_rug_warning_votes_ticker_idx
  on crypti_ticker_rug_warning_votes (ticker_id);

create index if not exists crypti_ticker_rug_warning_votes_member_idx
  on crypti_ticker_rug_warning_votes (member_id);

alter table crypti_ticker_rug_warning_votes enable row level security;

revoke all on table crypti_ticker_rug_warning_votes
from anon, authenticated;

grant select, insert, update, delete on table crypti_ticker_rug_warning_votes
to service_role;

comment on table crypti_ticker_rug_warning_votes is
  'RLS enabled. Stores one Rug City warning vote per Crypti ticker and member.';
