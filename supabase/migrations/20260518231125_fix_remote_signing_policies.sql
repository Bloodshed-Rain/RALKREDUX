-- 1. Drop the dangerous and redundant write policies
drop policy if exists "Owners can create hosted remote signing requests" on public.remote_signing_requests;
drop policy if exists "Owners can cancel hosted remote signing requests" on public.remote_signing_requests;

-- 2. Fix the performance issue on the read policy
drop policy if exists "Owners can read hosted remote signing requests" on public.remote_signing_requests;

create policy "Owners can read hosted remote signing requests"
  on public.remote_signing_requests
  for select
  to authenticated
  using (auth.uid() = owner_id);
