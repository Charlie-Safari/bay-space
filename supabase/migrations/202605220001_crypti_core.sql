create table if not exists crypti_tickers (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  company text not null default '',
  chain_market text not null default '',
  asset_type text not null default '',
  category text not null default 'rocket-fuel',
  note text not null default '',
  submitted_by_member_id uuid references members(id) on delete set null,
  status moderation_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crypti_ticker_votes (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid not null references crypti_tickers(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  vote_day_key date not null,
  vote_value smallint not null check (vote_value in (-2, -1, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticker_id, member_id, vote_day_key)
);

create index if not exists crypti_tickers_category_idx
  on crypti_tickers (category, created_at desc);

create index if not exists crypti_ticker_votes_ticker_day_idx
  on crypti_ticker_votes (ticker_id, vote_day_key);

create index if not exists crypti_ticker_votes_member_day_idx
  on crypti_ticker_votes (member_id, vote_day_key);

alter table crypti_tickers enable row level security;
alter table crypti_ticker_votes enable row level security;

revoke all on table
  crypti_tickers,
  crypti_ticker_votes
from anon, authenticated;

grant select, insert, update, delete on table
  crypti_tickers,
  crypti_ticker_votes
to service_role;

comment on table crypti_tickers is
  'RLS enabled. Crypti ticker library records are managed through BaySpace server API routes.';

comment on table crypti_ticker_votes is
  'RLS enabled. Stores one Crypti sentiment vote per member, ticker, and noon-to-noon BaySpace day.';
