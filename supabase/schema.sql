-- Health Hub database. Paste this whole file into Supabase -> SQL Editor -> Run. Safe to run twice.

-- All app data lives here: one row per record (a day of Garmin data, a food entry, a weigh-in...).
create table if not exists public.records (
  collection text not null,
  id         text not null,
  date       date,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists records_collection_date on public.records (collection, date);

-- Private storage for the sync script (Garmin login token). Never readable from the app.
create table if not exists public.sync_state (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);

-- Lock everything down: only a signed-in user can read/write records; nobody but the
-- sync script (which uses the secret key) can touch sync_state.
alter table public.records enable row level security;
alter table public.sync_state enable row level security;

drop policy if exists "signed-in user has full access" on public.records;
create policy "signed-in user has full access" on public.records
  for all to authenticated using (true) with check (true);

-- Explicit access rights (needed when "automatically expose new tables" is off in the project).
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.records to authenticated;
grant all on public.records, public.sync_state to service_role;
revoke all on public.records, public.sync_state from anon;
