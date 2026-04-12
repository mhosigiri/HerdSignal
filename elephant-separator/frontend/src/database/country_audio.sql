-- Country-level prerecorded audio metadata. Files live in Storage bucket `country-audio`.
-- Apply in Supabase SQL editor; adjust if your project uses a different bucket name.

create table if not exists public.country_audio (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  iso_code text not null,
  title text not null default '',
  audio_path text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint country_audio_iso_code_alpha3 check (
    char_length(trim(iso_code)) = 3
    and trim(iso_code) <> ''
  ),
  constraint country_audio_audio_path_nonempty check (trim(audio_path) <> '')
);

create index if not exists country_audio_iso_active_idx
  on public.country_audio (iso_code)
  where is_active = true;

alter table public.country_audio enable row level security;

-- Anonymous clients can read active rows (metadata only; Storage access is separate).
create policy "Allow anon read active country_audio"
  on public.country_audio
  for select
  to anon
  using (is_active = true);
