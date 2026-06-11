-- ============================================================
-- Therapist CRM — Database Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles (extends auth.users) ──────────────────────────
create table public.profiles (
  id                    uuid references auth.users(id) on delete cascade primary key,
  email                 text not null,
  full_name             text,
  practice_name         text,
  timezone              text default 'America/New_York',
  phone                 text,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  subscription_status   text default 'trialing' check (subscription_status in ('trialing','active','past_due','canceled','incomplete')),
  trial_ends_at         timestamptz default (now() + interval '14 days'),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Clients ─────────────────────────────────────────────────
create table public.clients (
  id            uuid default uuid_generate_v4() primary key,
  therapist_id  uuid references public.profiles(id) on delete cascade not null,
  full_name     text not null,
  email         text,
  phone         text,
  notes         text,
  tags          text[] default '{}',
  archived_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Therapists manage own clients"
  on public.clients for all
  using (auth.uid() = therapist_id);

create index clients_therapist_idx on public.clients(therapist_id);
create index clients_archived_idx on public.clients(archived_at) where archived_at is null;

-- ─── Appointments ────────────────────────────────────────────
create table public.appointments (
  id              uuid default uuid_generate_v4() primary key,
  therapist_id    uuid references public.profiles(id) on delete cascade not null,
  client_id       uuid references public.clients(id) on delete cascade not null,
  title           text default 'Session',
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  status          text default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  notes           text,
  reminder_24h_sent boolean default false,
  reminder_1h_sent  boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Therapists manage own appointments"
  on public.appointments for all
  using (auth.uid() = therapist_id);

create index appointments_therapist_idx on public.appointments(therapist_id);
create index appointments_start_time_idx on public.appointments(start_time);
create index appointments_status_idx on public.appointments(status);

-- ─── Reminder queue ──────────────────────────────────────────
create table public.reminders (
  id              uuid default uuid_generate_v4() primary key,
  appointment_id  uuid references public.appointments(id) on delete cascade not null,
  type            text not null check (type in ('24h','1h')),
  send_at         timestamptz not null,
  status          text default 'pending' check (status in ('pending','sent','failed','skipped')),
  error           text,
  sent_at         timestamptz,
  created_at      timestamptz default now()
);

alter table public.reminders enable row level security;

create policy "Service role only"
  on public.reminders for all
  using (false); -- only accessible via service role

create index reminders_send_at_idx on public.reminders(send_at) where status = 'pending';

-- ─── Updated_at trigger ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_clients_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();

create trigger set_appointments_updated_at before update on public.appointments
  for each row execute procedure public.set_updated_at();
