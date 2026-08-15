-- Execute uma vez no SQL Editor do Supabase, depois de SUPABASE-FAVORITOS.sql.

create table if not exists public.user_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  target_price numeric(12,2) not null check (target_price > 0),
  is_active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

create table if not exists public.user_recent_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, offer_id)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  email text not null,
  phone text,
  subject text not null check (char_length(subject) between 2 and 140),
  message text not null check (char_length(message) between 5 and 4000),
  status text not null default 'new' check (status in ('new','read','answered','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.offer_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  offer_id uuid not null references public.offers(id) on delete cascade,
  report_type text not null check (report_type in ('price_changed','unavailable','broken_link','other')),
  message text,
  status text not null default 'new' check (status in ('new','reviewing','resolved','archived')),
  created_at timestamptz not null default now()
);

create index if not exists user_price_alerts_user_idx on public.user_price_alerts(user_id, is_active, created_at desc);
create index if not exists user_recent_views_user_idx on public.user_recent_views(user_id, viewed_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);
create index if not exists offer_reports_status_idx on public.offer_reports(status, created_at desc);

alter table public.user_price_alerts enable row level security;
alter table public.user_recent_views enable row level security;
alter table public.contact_messages enable row level security;
alter table public.offer_reports enable row level security;

drop policy if exists "Usuário gerencia seus alertas" on public.user_price_alerts;
create policy "Usuário gerencia seus alertas" on public.user_price_alerts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Usuário gerencia seus vistos" on public.user_recent_views;
create policy "Usuário gerencia seus vistos" on public.user_recent_views for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Usuário cria mensagens" on public.contact_messages;
create policy "Usuário cria mensagens" on public.contact_messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Usuário cria denúncias" on public.offer_reports;
create policy "Usuário cria denúncias" on public.offer_reports for insert to authenticated with check (auth.uid() = user_id);
