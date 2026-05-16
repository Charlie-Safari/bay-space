create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_category') then
    create type post_category as enum (
      'top-story',
      'daily-food',
      'theory',
      'library-submission'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'moderation_status') then
    create type moderation_status as enum (
      'active',
      'flagged',
      'hidden',
      'removed'
    );
  end if;
end $$;

create sequence if not exists bay_member_number_seq start with 33332;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_number integer not null unique default nextval('bay_member_number_seq'),
  name text not null default 'explorer',
  ref_name text not null default '',
  title text not null default 'Curious Reader',
  email text not null default '',
  birthday_month text not null default '',
  birthday_year text not null default '',
  links jsonb not null default '{}',
  agreement_version text not null default '',
  agreement_accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_credentials (
  member_id uuid primary key references members(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_roles (
  member_id uuid references members(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, role)
);

create table if not exists member_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  category post_category not null,
  title text not null default '',
  body text not null default '',
  author_member_id uuid references members(id) on delete set null,
  author_member_number integer,
  anonymous boolean not null default false,
  incognito boolean not null default false,
  shelf_label text,
  shelf_code text,
  meta jsonb not null default '{}',
  moderation_status moderation_status not null default 'active',
  moderation_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date_key date not null default ((now() at time zone 'America/Los_Angeles')::date)
);

create table if not exists saved_posts (
  member_id uuid references members(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, post_id)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_member_id uuid references members(id) on delete set null,
  subject_member_id uuid references members(id) on delete set null,
  subject_post_id uuid references posts(id) on delete cascade,
  body text not null default '',
  status moderation_status not null default 'active',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists members_member_number_idx on members (member_number);
create unique index if not exists members_ref_name_unique_idx
  on members (lower(ref_name))
  where deleted_at is null;
create index if not exists member_sessions_token_hash_idx on member_sessions (token_hash);
create index if not exists member_sessions_member_idx on member_sessions (member_id);
create index if not exists posts_category_created_at_idx on posts (category, created_at desc);
create index if not exists posts_author_member_number_idx on posts (author_member_number);
create index if not exists posts_shelf_code_idx on posts (shelf_code);
create index if not exists posts_date_key_idx on posts (date_key);
create index if not exists saved_posts_post_idx on saved_posts (post_id);

alter table members enable row level security;
alter table auth_credentials enable row level security;
alter table member_roles enable row level security;
alter table member_sessions enable row level security;
alter table posts enable row level security;
alter table saved_posts enable row level security;
alter table reports enable row level security;

revoke all on table
  members,
  auth_credentials,
  member_roles,
  member_sessions,
  posts,
  saved_posts,
  reports
from anon, authenticated;

revoke all on sequence bay_member_number_seq from anon, authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  members,
  auth_credentials,
  member_roles,
  member_sessions,
  posts,
  saved_posts,
  reports
to service_role;

grant usage, select, update on sequence bay_member_number_seq to service_role;

comment on table members is
  'RLS enabled. Bay Space uses server-side API routes with the service role key; direct anon/authenticated Supabase table access is denied by default.';
comment on table auth_credentials is
  'RLS enabled. Stores salted PIN hashes only. No anon/authenticated direct access.';
comment on table member_roles is
  'RLS enabled. Roles are exposed only through server API responses when authorized.';
comment on table member_sessions is
  'RLS enabled. Stores hashed HttpOnly session tokens only. No anon/authenticated direct access.';
comment on table posts is
  'RLS enabled. Public reads and writes go through Bay Space API routes so moderation and identity checks stay server-side.';
comment on table saved_posts is
  'RLS enabled. Saved posts are managed through Bay Space API routes using the HttpOnly session cookie.';
comment on table reports is
  'RLS enabled. Moderation reports are server-only unless future policies are explicitly added.';
