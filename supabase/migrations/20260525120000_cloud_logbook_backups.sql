-- Per-user cloud backup & restore (disaster recovery).
-- Optional/augmenting layer: local SQLite remains canonical. No app behavior
-- changes when EXPO_PUBLIC_SUPABASE_* are unset; the client simply never calls
-- these paths. Owner-scoped, fully authenticated -> RLS only, no Edge Function.

-- ---------------------------------------------------------------------------
-- Metadata table: one row per stored snapshot. The blob itself lives in the
-- private 'logbook-backups' Storage bucket; this table holds list-view fields
-- so the restore UI can show "last backup: when / how many entries" without
-- downloading the blob.
-- ---------------------------------------------------------------------------
create table if not exists public.logbook_backups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Path of the snapshot object within the 'logbook-backups' bucket,
  -- e.g. '<owner_id>/2026-05-25T12-00-00-000Z.json'. The first path segment
  -- MUST equal owner_id (enforced by Storage RLS below).
  storage_path text not null,
  backup_schema_version integer not null,   -- mirrors BackupSnapshot.backup_schema_version
  app_schema_version integer not null,       -- high-water mark of schema_migrations.id at backup time
  entry_count integer not null default 0,
  gear_count integer not null default 0,
  signature_count integer not null default 0,
  byte_size bigint not null default 0,       -- client-computed snapshot size, for UI
  sha256_hex text,                           -- optional integrity check after download
  device_label text,                         -- e.g. "android 35"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, storage_path)
);

-- List view always filters/sorts by owner + recency.
create index if not exists idx_logbook_backups_owner
  on public.logbook_backups(owner_id, created_at desc);

alter table public.logbook_backups enable row level security;

-- RLS: append-only with prune. Owner can read, insert, and delete only their
-- own rows. No UPDATE policy: rows are immutable once written (new backup =
-- new row + new object). Default-deny otherwise.
create policy "Owners can read their logbook backups"
  on public.logbook_backups
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create their logbook backups"
  on public.logbook_backups
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their logbook backups"
  on public.logbook_backups
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- updated_at trigger (convention parity with remote_signing_requests, even
-- though rows are effectively immutable today).
create or replace function public.set_logbook_backups_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_logbook_backups_updated_at
  on public.logbook_backups;

create trigger trg_logbook_backups_updated_at
before update on public.logbook_backups
for each row
execute function public.set_logbook_backups_updated_at();

-- ---------------------------------------------------------------------------
-- Private Storage bucket for the snapshot blobs.
-- public=false  -> objects only reachable via authenticated client or signed URLs.
-- file_size_limit 50 MB (defensive; snapshots are <few MB).
-- allowed_mime_types restricts uploads to JSON.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logbook-backups',
  'logbook-backups',
  false,
  52428800,                      -- 50 MiB in bytes
  array['application/json']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS on storage.objects, scoped to this bucket. Path convention:
--   <owner_id>/<filename>.json
-- so (storage.foldername(name))[1] is the owner_id (text). auth.uid() is uuid,
-- hence the ::text cast -- without it the comparison silently matches nothing.
-- With upsert:false we need INSERT + SELECT + DELETE (no UPDATE).
-- ---------------------------------------------------------------------------
create policy "Owners can read their backup objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'logbook-backups'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners can upload their backup objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logbook-backups'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners can delete their backup objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logbook-backups'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
