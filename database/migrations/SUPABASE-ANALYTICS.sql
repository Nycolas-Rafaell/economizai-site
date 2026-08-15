-- Economizaí: métricas anônimas de navegação e ofertas.
-- Execute uma única vez no SQL Editor do Supabase.

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'offer_view', 'affiliate_click', 'category_view')),
  session_id text not null check (char_length(session_id) between 8 and 90),
  page_path text not null check (char_length(page_path) between 1 and 180),
  offer_external_id text,
  category_slug text,
  created_at timestamptz not null default now()
);

create index if not exists site_events_created_at_idx on public.site_events(created_at desc);
create index if not exists site_events_type_created_idx on public.site_events(event_type, created_at desc);
create index if not exists site_events_offer_created_idx on public.site_events(offer_external_id, created_at desc) where offer_external_id is not null;
create index if not exists site_events_category_created_idx on public.site_events(category_slug, created_at desc) where category_slug is not null;

alter table public.site_events enable row level security;
-- Os eventos chegam somente pelo servidor do Economizaí, usando a chave secreta.
-- Não há política pública de leitura ou escrita direta.
