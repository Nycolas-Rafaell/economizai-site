-- Execute uma vez no SQL Editor do Supabase.

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('report', 'contact')),
  entity_id uuid not null,
  previous_status text not null,
  next_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_logs_entity_idx
  on public.admin_action_logs(entity_type, entity_id, created_at desc);

alter table public.admin_action_logs enable row level security;
