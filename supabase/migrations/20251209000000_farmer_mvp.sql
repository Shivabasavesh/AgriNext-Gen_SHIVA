-- Farmer Web App MVP additive migration
-- Adds farmer-friendly columns, profiles table, and AI logging without removing existing features

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles table (for farmer app) -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'farmer',
  name text,
  phone text,
  district text,
  village text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are selectable by owner'
  ) then
    create policy "Profiles are selectable by owner" on public.profiles
      for select using (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are insertable by owner'
  ) then
    create policy "Profiles are insertable by owner" on public.profiles
      for insert with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are updatable by owner'
  ) then
    create policy "Profiles are updatable by owner" on public.profiles
      for update using (id = auth.uid());
  end if;
end$$;

-- Crops enhancements --------------------------------------------------------------
alter table public.crops
  add column if not exists expected_harvest_date date,
  add column if not exists expected_quantity_kg numeric,
  add column if not exists district text,
  add column if not exists mvp_status text not null default 'GROWING';

create index if not exists crops_farmer_id_idx on public.crops (farmer_id);

-- Transport requests enhancements -------------------------------------------------
alter table public.transport_requests
  add column if not exists quantity_kg numeric,
  add column if not exists pickup_location_text text,
  add column if not exists status text not null default 'NEW';

create index if not exists transport_requests_farmer_id_idx on public.transport_requests (farmer_id);

-- AI logs -------------------------------------------------------------------------
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  module_type text not null,
  input_data jsonb,
  output_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_logs_user_id_idx on public.ai_logs (user_id);
alter table public.ai_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_logs' and policyname = 'AI logs selectable by owner'
  ) then
    create policy "AI logs selectable by owner" on public.ai_logs
      for select using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_logs' and policyname = 'AI logs insertable by owner'
  ) then
    create policy "AI logs insertable by owner" on public.ai_logs
      for insert with check (user_id = auth.uid());
  end if;
end$$;
