-- Keep historical Facts on News entries intact while enforcing a shared limit
-- of five active posts per Facts category and Pacific calendar day going
-- forward. The advisory lock prevents simultaneous requests from exceeding the
-- limit.
create or replace function public.enforce_daily_food_category_post_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_category text;
  existing_post_count integer;
begin
  if new.category <> 'daily-food'
    or new.deleted_at is not null
    or new.date_key < date '2026-10-14' then
    return new;
  end if;

  normalized_category := coalesce(
    nullif(btrim(new.meta ->> 'dailyFoodCategory'), ''),
    'Misc'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(new.date_key::text || '|' || normalized_category, 0)
  );

  select count(*)
  into existing_post_count
  from public.posts
  where category = 'daily-food'
    and deleted_at is null
    and date_key = new.date_key
    and coalesce(
      nullif(btrim(meta ->> 'dailyFoodCategory'), ''),
      'Misc'
    ) = normalized_category
    and id <> new.id;

  if existing_post_count >= 5 then
    raise exception using
      errcode = '23505',
      constraint = 'posts_daily_food_category_date_limit',
      message = 'Facts on News category has reached its five-post daily limit.';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_daily_food_category_date_limit_trigger
  on public.posts;

create trigger posts_daily_food_category_date_limit_trigger
before insert or update of category, date_key, deleted_at, meta
on public.posts
for each row
execute function public.enforce_daily_food_category_post_limit();

alter table public.members
  add column if not exists namaste_redeemed_at timestamptz;

comment on column public.members.namaste_redeemed_at is
  'Timestamp of the member account one-time namaste reward redemption.';
