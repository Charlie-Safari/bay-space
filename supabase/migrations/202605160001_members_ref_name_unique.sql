create unique index if not exists members_ref_name_unique_idx
  on public.members (lower(ref_name))
  where deleted_at is null;
