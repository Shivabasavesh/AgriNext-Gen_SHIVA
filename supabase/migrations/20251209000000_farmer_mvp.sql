-- Farmer Web App MVP schema
-- Recreates core tables with RLS policies for farmer-only access

-- Extensions
create extension if not exists "pgcrypto";

-- Drop existing tables to align with the MVP schema
drop table if exists ai_logs cascade;
drop table if exists transport_requests cascade;
drop table if exists crops cascade;
drop table if exists profiles cascade;

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'FARMER',
  name text,
  phone text,
  district text,
  village text,
  created_at timestamptz not null default now()
);

-- Crops table
create table public.crops (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  crop_name text not null,
  expected_harvest_date date,
  expected_quantity_kg numeric,
  status text not null default 'GROWING',
  district text,
  created_at timestamptz not null default now()
);

-- Transport requests table
create table public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  crop_id uuid not null references public.crops (id) on delete cascade,
  quantity_kg numeric,
  pickup_date date,
  pickup_location_text text,
  status text not null default 'NEW',
  created_at timestamptz not null default now()
);

-- AI logs table
create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_type text not null,
  input_data jsonb,
  output_data jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index crops_farmer_id_idx on public.crops (farmer_id);
create index transport_requests_farmer_id_idx on public.transport_requests (farmer_id);
create index ai_logs_user_id_idx on public.ai_logs (user_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.crops enable row level security;
alter table public.transport_requests enable row level security;
alter table public.ai_logs enable row level security;

-- Profiles policies
create policy "Profiles are selectable by owner" on public.profiles
  for select using (id = auth.uid());

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (id = auth.uid());

create policy "Profiles are updatable by owner" on public.profiles
  for update using (id = auth.uid());

-- Crops policies
create policy "Crops accessible by farmer" on public.crops
  using (farmer_id = auth.uid())
  with check (farmer_id = auth.uid());

-- Transport request policies
create policy "Transport requests accessible by farmer" on public.transport_requests
  using (farmer_id = auth.uid())
  with check (farmer_id = auth.uid());

-- AI logs policies
create policy "AI logs selectable by owner" on public.ai_logs
  for select using (user_id = auth.uid());

create policy "AI logs insertable by owner" on public.ai_logs
  for insert with check (user_id = auth.uid());
