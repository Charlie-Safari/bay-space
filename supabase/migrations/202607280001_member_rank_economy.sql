alter table public.members
  add column if not exists rank text not null default 'reader',
  add column if not exists crypti_rank text not null default '',
  add column if not exists lifetime_points integer not null default 0,
  add column if not exists available_points integer not null default 0,
  add column if not exists bayo_coins integer not null default 0,
  add column if not exists purchased_titles jsonb not null default '[]'::jsonb,
  add column if not exists gate_keys jsonb not null default '[]'::jsonb;

alter table public.members
  alter column title set default 'Reader';

update public.members
set title = 'Reader'
where title = 'Curious Reader';

update public.members as members
set rank = case
  when exists (
    select 1
    from public.member_roles as roles
    where roles.member_id = members.id
      and lower(roles.role) in ('crypti', 'bayo club')
  ) then 'graduation'
  when exists (
    select 1
    from public.member_roles as roles
    where roles.member_id = members.id
      and lower(roles.role) in (
        'influencer - daily food',
        'influencer - theories',
        'poster-ii',
        'poster-iii'
      )
  ) then 'poster-ii'
  when rank = '' then 'reader'
  else rank
end;

update public.members as members
set gate_keys = (
  select jsonb_agg(distinct key_name)
  from jsonb_array_elements_text(
    gate_keys ||
      case
        when exists (
          select 1
          from public.member_roles as roles
          where roles.member_id = members.id
            and lower(roles.role) = 'crypti'
        ) then '["crypti-plus"]'::jsonb
        else '[]'::jsonb
      end ||
      case
        when exists (
          select 1
          from public.member_roles as roles
          where roles.member_id = members.id
            and lower(roles.role) = 'bayo club'
        ) then '["bayo-plus"]'::jsonb
        else '[]'::jsonb
      end
  ) as merged_keys(key_name)
)
where exists (
  select 1
  from public.member_roles as roles
  where roles.member_id = members.id
    and lower(roles.role) in ('crypti', 'bayo club')
);

update public.members as members
set crypti_rank = 'poster-v'
where exists (
  select 1
  from public.member_roles as roles
  where roles.member_id = members.id
    and lower(roles.role) = 'crypti'
);

comment on column public.members.rank is
  'Earned Bay Space rank: reader, reader-ii, poster, poster-ii, poster-iii, or graduation.';
comment on column public.members.crypti_rank is
  'Crypti+ branch rank after purchasing the Crypti+ gate key.';
comment on column public.members.lifetime_points is
  'Total earned reputation points. Promotions should use this value.';
comment on column public.members.available_points is
  'Unspent reputation points that can be exchanged after graduation.';
comment on column public.members.bayo_coins is
  'Spendable Bayo Coins received through point exchange.';
comment on column public.members.purchased_titles is
  'JSON list of purchased title ids.';
comment on column public.members.gate_keys is
  'JSON list of purchased gate key ids.';
