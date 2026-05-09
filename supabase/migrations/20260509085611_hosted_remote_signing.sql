create table if not exists public.remote_signing_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  local_request_id text not null,
  local_entry_id text not null,
  request_code text not null,
  recipient_name text not null,
  recipient_contact text,
  verifier_role text,
  verifier_company text,
  entry_payload jsonb not null,
  entry_hash text not null,
  hash_version integer not null,
  signing_token_hash text not null,
  token_hint text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  viewed_at timestamptz,
  completed_at timestamptz,
  completed_signature_payload jsonb,
  completed_signature_id text,
  completed_ip_hash text,
  completed_user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, local_request_id),
  unique (request_code)
);

create index if not exists idx_remote_signing_requests_owner
  on public.remote_signing_requests(owner_id, created_at desc);

create index if not exists idx_remote_signing_requests_code
  on public.remote_signing_requests(request_code);

create index if not exists idx_remote_signing_requests_status
  on public.remote_signing_requests(status, expires_at);

alter table public.remote_signing_requests enable row level security;

create policy "Owners can read hosted remote signing requests"
  on public.remote_signing_requests
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create hosted remote signing requests"
  on public.remote_signing_requests
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can cancel hosted remote signing requests"
  on public.remote_signing_requests
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and status in ('pending', 'cancelled', 'expired')
  );

create or replace function public.set_remote_signing_requests_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_remote_signing_requests_updated_at
  on public.remote_signing_requests;

create trigger trg_remote_signing_requests_updated_at
before update on public.remote_signing_requests
for each row
execute function public.set_remote_signing_requests_updated_at();
