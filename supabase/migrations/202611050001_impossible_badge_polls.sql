-- Impossible is a badge, not a rank or card. Preserve any legacy owner.
update public.members
set gate_keys = gate_keys || '["impossible-badge"]'::jsonb,
    links = (links - '_bayoCards') || jsonb_build_object(
      '_bayoCards',
      coalesce(
        (
          select jsonb_agg(card_id)
          from jsonb_array_elements_text(coalesce(links -> '_bayoCards', '[]'::jsonb)) as cards(card_id)
          where card_id <> 'impossible-card'
        ),
        '[]'::jsonb
      )
    ),
    updated_at = now()
where coalesce(links -> '_bayoCards', '[]'::jsonb) ? 'impossible-card'
  and not gate_keys ? 'impossible-badge';

update public.members
set links = (links - '_bayoCards') || jsonb_build_object(
  '_bayoCards',
  coalesce(
    (
      select jsonb_agg(card_id)
      from jsonb_array_elements_text(coalesce(links -> '_bayoCards', '[]'::jsonb)) as cards(card_id)
      where card_id <> 'impossible-card'
    ),
    '[]'::jsonb
  )
), updated_at = now()
where coalesce(links -> '_bayoCards', '[]'::jsonb) ? 'impossible-card';

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  author_member_id uuid not null references public.members(id) on delete restrict,
  author_member_number integer not null,
  question text not null check (char_length(question) between 1 and 150),
  status text not null default 'staging' check (status in ('staging', 'open', 'settled', 'cancelled')),
  opens_at timestamptz not null default (now() + interval '2 minutes'),
  closes_at timestamptz not null default (now() + interval '7 days'),
  winning_option_id uuid,
  cancelled_by_member_id uuid references public.members(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  position smallint not null check (position between 0 and 2),
  unique (poll_id, position),
  unique (poll_id, id)
);

alter table public.polls
  drop constraint if exists polls_winning_option_id_fkey,
  add constraint polls_winning_option_id_fkey
    foreign key (id, winning_option_id)
    references public.poll_options(poll_id, id)
    deferrable initially deferred;

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  member_number integer not null,
  option_id uuid not null references public.poll_options(id) on delete restrict,
  fee_coins integer not null default 1 check (fee_coins = 1),
  wager_currency text not null default 'none' check (wager_currency in ('none', 'coins', 'token')),
  wager_amount integer not null default 0,
  wager_point_value integer not null default 0 check (wager_point_value between 0 and 500),
  outcome text not null default 'pending' check (outcome in ('pending', 'won', 'lost', 'refunded')),
  payout_points integer not null default 0,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  primary key (poll_id, member_id)
);

create index if not exists polls_status_closes_at_idx on public.polls(status, closes_at);
create index if not exists polls_author_created_at_idx on public.polls(author_member_id, created_at desc);
create index if not exists poll_options_poll_id_idx on public.poll_options(poll_id, position);
create index if not exists poll_votes_member_created_at_idx on public.poll_votes(member_id, created_at desc);
create index if not exists poll_votes_poll_option_idx on public.poll_votes(poll_id, option_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

revoke all on table public.polls, public.poll_options, public.poll_votes
from anon, authenticated;

grant select, insert, update, delete on table
  public.polls,
  public.poll_options,
  public.poll_votes
to service_role;

drop policy if exists "service role manages polls" on public.polls;
create policy "service role manages polls" on public.polls for all to service_role using (true) with check (true);
drop policy if exists "service role manages poll options" on public.poll_options;
create policy "service role manages poll options" on public.poll_options for all to service_role using (true) with check (true);
drop policy if exists "service role manages poll votes" on public.poll_votes;
create policy "service role manages poll votes" on public.poll_votes for all to service_role using (true) with check (true);

create or replace function public.settle_one_bay_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_winning_option uuid;
  v_high_count integer := 0;
  v_high_count_options integer := 0;
  v_vote record;
  v_payout integer;
begin
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_poll.status in ('settled', 'cancelled') or v_poll.closes_at > now() then
    return;
  end if;

  select coalesce(max(vote_count), 0) into v_high_count
  from (
    select option_id, count(*)::integer as vote_count
    from public.poll_votes
    where poll_id = p_poll_id
    group by option_id
  ) totals;

  if v_high_count > 0 then
    select count(*)::integer
      into v_high_count_options
    from (
      select option_id, count(*)::integer as vote_count
      from public.poll_votes
      where poll_id = p_poll_id
      group by option_id
    ) totals
    where vote_count = v_high_count;

    if v_high_count_options = 1 then
      select option_id into v_winning_option
      from (
        select option_id, count(*)::integer as vote_count
        from public.poll_votes
        where poll_id = p_poll_id
        group by option_id
      ) totals
      where vote_count = v_high_count
      limit 1;
    else
      v_winning_option := null;
    end if;
  end if;

  for v_vote in
    select * from public.poll_votes where poll_id = p_poll_id and outcome = 'pending' for update
  loop
    if v_winning_option is null then
      if v_vote.wager_currency = 'coins' and v_vote.wager_amount > 0 then
        update public.members set bayo_coins = bayo_coins + v_vote.wager_amount, updated_at = now()
        where id = v_vote.member_id;
      elsif v_vote.wager_currency = 'token' and v_vote.wager_amount = 1 then
        update public.members
        set links = jsonb_set(
          coalesce(links, '{}'::jsonb),
          '{_bayoTokens}',
          to_jsonb(coalesce(nullif(links ->> '_bayoTokens', '')::integer, 0) + 1),
          true
        ), updated_at = now()
        where id = v_vote.member_id;
      end if;

      update public.poll_votes set outcome = 'refunded', settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    elsif v_vote.option_id = v_winning_option then
      v_payout := v_vote.wager_point_value * 2;
      if v_payout > 0 then
        update public.members set available_points = available_points + v_payout, updated_at = now()
        where id = v_vote.member_id;
      end if;
      update public.poll_votes set outcome = 'won', payout_points = v_payout, settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    else
      update public.poll_votes set outcome = 'lost', settled_at = now()
      where poll_id = p_poll_id and member_id = v_vote.member_id;
    end if;
  end loop;

  update public.polls
  set status = 'settled', winning_option_id = v_winning_option, updated_at = now()
  where id = p_poll_id;
end;
$$;

create or replace function public.settle_expired_bay_polls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll record;
  v_count integer := 0;
begin
  update public.polls set status = 'open', updated_at = now()
  where status = 'staging' and opens_at <= now() and closes_at > now();

  for v_poll in
    select id from public.polls
    where status in ('staging', 'open') and closes_at <= now()
    order by closes_at
  loop
    perform public.settle_one_bay_poll(v_poll.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.create_bay_poll(
  p_member_number integer,
  p_question text,
  p_options jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_poll_id uuid;
  v_option text;
  v_position integer := 0;
begin
  perform pg_advisory_xact_lock(920251105);
  perform public.settle_expired_bay_polls();
  select * into v_member from public.members
  where member_number = p_member_number and deleted_at is null for update;

  if not found or not coalesce(v_member.gate_keys, '[]'::jsonb) ? 'impossible-badge' then
    raise exception 'Impossible badge required';
  end if;
  if char_length(trim(p_question)) not between 1 and 150 then
    raise exception 'Poll question must be 1 to 150 characters';
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 3 then
    raise exception 'Polls require two or three answers';
  end if;
  if (select count(*) from public.polls where status in ('staging', 'open') and closes_at > now()) >= 16 then
    raise exception 'All 16 live poll slots are occupied';
  end if;

  insert into public.polls(author_member_id, author_member_number, question)
  values (v_member.id, v_member.member_number, trim(p_question))
  returning id into v_poll_id;

  for v_option in select jsonb_array_elements_text(p_options)
  loop
    if char_length(trim(v_option)) not between 1 and 80 then
      raise exception 'Poll answers must be 1 to 80 characters';
    end if;
    insert into public.poll_options(poll_id, label, position)
    values (v_poll_id, trim(v_option), v_position);
    v_position := v_position + 1;
  end loop;

  return v_poll_id;
end;
$$;

create or replace function public.edit_bay_poll(
  p_member_number integer,
  p_poll_id uuid,
  p_question text,
  p_options jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll public.polls%rowtype;
  v_option text;
  v_position integer := 0;
begin
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_poll.author_member_number <> p_member_number or v_poll.status <> 'staging'
    or now() >= v_poll.opens_at then
    raise exception 'The two-minute edit window is closed';
  end if;
  if char_length(trim(p_question)) not between 1 and 150
    or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 3 then
    raise exception 'Invalid poll';
  end if;

  delete from public.poll_options where poll_id = p_poll_id;
  for v_option in select jsonb_array_elements_text(p_options)
  loop
    if char_length(trim(v_option)) not between 1 and 80 then
      raise exception 'Poll answers must be 1 to 80 characters';
    end if;
    insert into public.poll_options(poll_id, label, position)
    values (p_poll_id, trim(v_option), v_position);
    v_position := v_position + 1;
  end loop;
  update public.polls set question = trim(p_question), updated_at = now() where id = p_poll_id;
  return true;
end;
$$;

create or replace function public.vote_bay_poll(
  p_member_number integer,
  p_poll_id uuid,
  p_option_id uuid,
  p_wager_currency text default 'none',
  p_wager_amount integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_poll public.polls%rowtype;
  v_coin_cost integer;
  v_token_balance integer;
  v_point_value integer;
begin
  perform public.settle_expired_bay_polls();
  select * into v_member from public.members where member_number = p_member_number and deleted_at is null for update;
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_member.id is null then raise exception 'Poll or member not found'; end if;
  if v_poll.status <> 'open' or now() < v_poll.opens_at or now() >= v_poll.closes_at then
    raise exception 'Poll is not open';
  end if;
  if not exists(select 1 from public.poll_options where id = p_option_id and poll_id = p_poll_id) then
    raise exception 'Invalid poll answer';
  end if;
  if exists(select 1 from public.poll_votes where poll_id = p_poll_id and member_id = v_member.id) then
    raise exception 'Vote already submitted';
  end if;

  if p_wager_currency = 'none' then
    p_wager_amount := 0;
    v_point_value := 0;
  elsif p_wager_currency = 'coins' and p_wager_amount between 1 and 5 then
    v_point_value := p_wager_amount * 100;
  elsif p_wager_currency = 'token' and p_wager_amount = 1 then
    v_point_value := 500;
  else
    raise exception 'Invalid wager';
  end if;

  v_coin_cost := 1 + case when p_wager_currency = 'coins' then p_wager_amount else 0 end;
  if v_member.bayo_coins < v_coin_cost then raise exception 'Not enough coins'; end if;
  v_token_balance := coalesce(nullif(v_member.links ->> '_bayoTokens', '')::integer, 0);
  if p_wager_currency = 'token' and v_token_balance < 1 then raise exception 'Not enough tokens'; end if;

  update public.members
  set bayo_coins = bayo_coins - v_coin_cost,
      links = case when p_wager_currency = 'token' then
        jsonb_set(coalesce(links, '{}'::jsonb), '{_bayoTokens}', to_jsonb(v_token_balance - 1), true)
      else links end,
      updated_at = now()
  where id = v_member.id;

  insert into public.poll_votes(
    poll_id, member_id, member_number, option_id, wager_currency, wager_amount, wager_point_value
  ) values (
    p_poll_id, v_member.id, v_member.member_number, p_option_id, p_wager_currency, p_wager_amount, v_point_value
  );
  return true;
end;
$$;

create or replace function public.cancel_bay_poll(
  p_member_number integer,
  p_poll_id uuid,
  p_admin boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.members%rowtype;
  v_poll public.polls%rowtype;
  v_vote record;
begin
  select * into v_actor from public.members where member_number = p_member_number and deleted_at is null;
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found or v_actor.id is null then raise exception 'Poll or member not found'; end if;
  if v_poll.status in ('settled', 'cancelled') then raise exception 'Poll is already closed'; end if;
  if not p_admin and (v_poll.author_member_id <> v_actor.id or now() >= v_poll.opens_at) then
    raise exception 'The two-minute cancellation window is closed';
  end if;

  if p_admin then
    for v_vote in select * from public.poll_votes where poll_id = p_poll_id for update
    loop
      update public.members
      set bayo_coins = bayo_coins + v_vote.fee_coins + case when v_vote.wager_currency = 'coins' then v_vote.wager_amount else 0 end,
          links = case when v_vote.wager_currency = 'token' then
            jsonb_set(coalesce(links, '{}'::jsonb), '{_bayoTokens}',
              to_jsonb(coalesce(nullif(links ->> '_bayoTokens', '')::integer, 0) + 1), true)
          else links end,
          updated_at = now()
      where id = v_vote.member_id;
    end loop;
    update public.poll_votes set outcome = 'refunded', settled_at = now() where poll_id = p_poll_id;
  end if;

  update public.polls
  set status = 'cancelled', cancelled_by_member_id = v_actor.id, cancelled_at = now(), updated_at = now()
  where id = p_poll_id;
  return true;
end;
$$;

revoke all on function public.settle_one_bay_poll(uuid) from public, anon, authenticated;
revoke all on function public.settle_expired_bay_polls() from public, anon, authenticated;
revoke all on function public.create_bay_poll(integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.edit_bay_poll(integer, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.vote_bay_poll(integer, uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.cancel_bay_poll(integer, uuid, boolean) from public, anon, authenticated;
grant execute on function public.settle_one_bay_poll(uuid) to service_role;
grant execute on function public.settle_expired_bay_polls() to service_role;
grant execute on function public.create_bay_poll(integer, text, jsonb) to service_role;
grant execute on function public.edit_bay_poll(integer, uuid, text, jsonb) to service_role;
grant execute on function public.vote_bay_poll(integer, uuid, uuid, text, integer) to service_role;
grant execute on function public.cancel_bay_poll(integer, uuid, boolean) to service_role;
