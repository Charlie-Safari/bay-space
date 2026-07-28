alter table public.members
  add column if not exists crypti_agreement_version text not null default '',
  add column if not exists crypti_agreement_accepted_at timestamptz;

comment on column public.members.crypti_agreement_version is
  '+CRYPTI user agreement version accepted after purchasing the +CRYPTI gate key.';

comment on column public.members.crypti_agreement_accepted_at is
  'Timestamp when the member accepted the +CRYPTI user agreement in settings.';
