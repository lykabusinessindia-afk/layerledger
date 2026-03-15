create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('starter', 'pro', 'studio')),
  job_limit integer,
  used_jobs_current_period integer not null default 0,
  active boolean not null default true,
  renewal_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  order_id text not null,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.printer_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  power integer not null,
  speed integer not null,
  machine_cost_per_hour numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  density numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  order_id text not null,
  customer_name text,
  file_url text not null,
  printer text not null,
  material text not null,
  filament_usage numeric not null default 0,
  print_time numeric not null default 0,
  status text not null check (status in ('pending', 'printing', 'completed')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_user_id on public.jobs(user_id);
create index if not exists idx_jobs_created_at on public.jobs(created_at desc);
create index if not exists idx_uploaded_models_order_id on public.uploaded_models(order_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
