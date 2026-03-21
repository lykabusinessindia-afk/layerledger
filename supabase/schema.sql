create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

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

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  estimated_price numeric not null default 0,
  token_paid numeric not null default 0,
  remaining_amount numeric not null default 0,
  status text not null check (status in ('Token Paid', 'Price Confirmed', 'Remaining Payment Pending', 'Completed')),
  status_flow jsonb not null default '["Token Paid", "Price Confirmed", "Remaining Payment Pending", "Completed"]'::jsonb,
  checkout_url text,
  remaining_checkout_url text,
  payment_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_payments_order_ref on public.order_payments(order_ref);
create index if not exists idx_order_payments_status on public.order_payments(status);

create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  email text,
  amount numeric,
  status text default 'pending',
  razorpay_payment_id text,
  razorpay_order_id text,
  weight numeric,
  quantity integer,
  material text,
  quality text,
  final_price numeric,
  token_paid numeric,
  remaining_amount numeric,
  customer_phone text,
  customer_email text,
  file_url text,
  payment_id text,
  order_status text default 'pending',
  reminder_sent boolean default false,
  final_payment_status text default 'pending'
);

alter table if exists public.orders
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_order_id text,
  add column if not exists email text,
  add column if not exists amount numeric,
  add column if not exists status text default 'pending',
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists file_url text,
  add column if not exists reminder_sent boolean default false,
  add column if not exists final_payment_status text default 'pending';

alter table if exists public.orders
  alter column created_at type timestamptz using created_at at time zone 'UTC',
  alter column created_at set default now();

alter table if exists public.orders disable row level security;
