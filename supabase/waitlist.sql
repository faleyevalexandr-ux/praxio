-- Founding-cohort waitlist. Захватывает заявки "готов платить" до запуска.
-- Запустить один раз в Supabase SQL Editor.
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  practice_type text,
  current_tool text,
  willing_to_pay boolean default true,
  created_at timestamptz default now()
);

-- RLS включён, публичных политик нет: запись только через service-role API-роут.
alter table waitlist enable row level security;
