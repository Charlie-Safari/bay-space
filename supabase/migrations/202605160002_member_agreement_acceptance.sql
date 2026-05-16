alter table public.members
  add column if not exists agreement_version text not null default '',
  add column if not exists agreement_accepted_at timestamptz;
