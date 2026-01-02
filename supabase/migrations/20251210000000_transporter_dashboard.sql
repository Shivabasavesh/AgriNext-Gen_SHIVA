-- Transporter dashboard MVP migration
set check_function_bodies = off;

create extension if not exists "pgcrypto";

-- Trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Trip stops
create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  transport_request_id uuid references public.transport_requests (id) on delete set null,
  stop_type text not null,
  sequence int not null,
  location_text text,
  status text not null default 'PENDING',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Transport requests extensions (after trips exists for FK)
alter table public.transport_requests
  add column if not exists drop_location_text text,
  add column if not exists assigned_transporter_id uuid references public.profiles (id) on delete set null,
  add column if not exists trip_id uuid references public.trips (id) on delete set null,
  alter column status set default 'NEW';

-- Proofs
create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  trip_stop_id uuid not null references public.trip_stops (id) on delete cascade,
  proof_type text not null,
  photo_url text,
  note text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Reverse load suggestions
create table if not exists public.reverse_load_suggestions (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references public.profiles (id) on delete cascade,
  from_location_text text,
  to_location_text text,
  suggested_items jsonb,
  status text not null default 'SUGGESTED',
  created_at timestamptz not null default now()
);

-- Ensure ai_logs exists
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_type text not null,
  input_data jsonb,
  output_data jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists transport_requests_status_idx on public.transport_requests (status);
create index if not exists transport_requests_assigned_status_idx on public.transport_requests (assigned_transporter_id, status);
create index if not exists trips_transporter_status_idx on public.trips (transporter_id, status);
create index if not exists trip_stops_trip_seq_idx on public.trip_stops (trip_id, sequence);
create index if not exists proofs_trip_stop_id_idx on public.proofs (trip_stop_id);
create index if not exists reverse_load_suggestions_user_status_idx on public.reverse_load_suggestions (transporter_id, status);

-- RLS
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.proofs enable row level security;
alter table public.reverse_load_suggestions enable row level security;
alter table public.ai_logs enable row level security;
alter table public.transport_requests enable row level security;

-- transport_requests policies
create policy if not exists "transport_requests_select_new_or_assigned" on public.transport_requests
  for select using (status = 'NEW' or assigned_transporter_id = auth.uid());

create policy if not exists "transport_requests_update_assigned" on public.transport_requests
  for update using (assigned_transporter_id = auth.uid());

-- trips policies
create policy if not exists "trips_all_for_owner" on public.trips
  using (transporter_id = auth.uid())
  with check (transporter_id = auth.uid());

-- trip_stops policies
create policy if not exists "trip_stops_all_for_owner" on public.trip_stops
  using (trip_id in (select id from public.trips where transporter_id = auth.uid()))
  with check (trip_id in (select id from public.trips where transporter_id = auth.uid()));

-- proofs policies
create policy if not exists "proofs_owner_only" on public.proofs
  using (created_by = auth.uid() and trip_stop_id in (
    select ts.id from public.trip_stops ts
      join public.trips t on t.id = ts.trip_id
    where t.transporter_id = auth.uid()
  ))
  with check (created_by = auth.uid() and trip_stop_id in (
    select ts.id from public.trip_stops ts
      join public.trips t on t.id = ts.trip_id
    where t.transporter_id = auth.uid()
  ));

-- reverse_load_suggestions policies
create policy if not exists "reverse_load_suggestions_owner" on public.reverse_load_suggestions
  using (transporter_id = auth.uid())
  with check (transporter_id = auth.uid());

-- ai_logs policies
create policy if not exists "ai_logs_owner" on public.ai_logs
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage bucket for trip proofs
insert into storage.buckets (id, name, public) values ('trip-proofs', 'trip-proofs', true)
  on conflict (id) do nothing;

-- Storage policy (simplified): allow authenticated users to manage their own folder
create policy if not exists "Trip proofs user access" on storage.objects
  for all using (
    bucket_id = 'trip-proofs' and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'trip-proofs' and auth.role() = 'authenticated'
  );
